'use strict';
(() => {
  const data = globalThis.RESEARCH_DASHBOARD;
  if (!data) { document.getElementById('edition').textContent = '研究数据暂不可用'; return; }
  const el = (tag, className = '', value = '') => {
    const node = document.createElement(tag); node.className = className; node.textContent = value; return node;
  };
  document.getElementById('edition').textContent = `${data.edition} · 数据 ${data.dataStart} 至 ${data.dataEnd}`;
  function metrics(items) {
    const group = el('div', 'metrics');
    items.forEach(item => {
      const node = el('div', 'metric');
      const value = el('p', 'metric-value', item.value);
      value.append(el('span', 'metric-unit', item.unit));
      node.append(el('p', 'metric-label', item.label), value, el('p', 'metric-detail', item.detail));
      group.append(node);
    });
    return group;
  }
  document.getElementById('overview').append(metrics(data.metrics));
  const viewer = document.getElementById('viewer');
  const canvas = viewer.querySelector('.viewer-canvas');
  const viewerImage = document.getElementById('viewer-image');
  const zoomValue = document.getElementById('zoom-value');
  let opener, activeChart, zoom = 1, minimumZoom = 1;
  function applyZoom(next) {
    zoom = Math.max(minimumZoom, Math.min(3, next));
    viewerImage.style.width = `${Math.round(activeChart.width * zoom)}px`;
    zoomValue.value = `${Math.round(zoom * 100)}%`;
    document.getElementById('zoom-out').disabled = zoom <= minimumZoom + .001;
    document.getElementById('zoom-in').disabled = zoom >= 3;
  }
  function fit() {
    minimumZoom = Math.min(1, (canvas.clientWidth - 20) / activeChart.width, (canvas.clientHeight - 20) / activeChart.height);
    applyZoom(minimumZoom); canvas.scrollTo(0, 0);
  }
  function openChart(chart, button) {
    opener = button; activeChart = chart;
    viewerImage.src = chart.src; viewerImage.alt = chart.title;
    document.getElementById('viewer-title').textContent = chart.title;
    document.getElementById('viewer-date').textContent = chart.dateLabel;
    viewer.showModal(); document.body.style.overflow = 'hidden';
    fit(); document.getElementById('viewer-close').focus();
  }
  const chartMap = new Map(data.charts.map(chart => [chart.id, chart]));
  function chartNode(chart) {
    const figure = el('figure', `chart${chart.tall ? ' tall' : ''}`);
    const button = el('button', 'chart-open');
    button.type = 'button'; button.title = `查看${chart.title}`;
    button.setAttribute('aria-label', `查看${chart.title}`);
    const image = el('img', 'chart-image');
    image.src = chart.src; image.alt = chart.title; image.width = chart.width; image.height = chart.height;
    image.style.setProperty('--image-ratio', `${chart.width} / ${chart.height}`);
    image.loading = chart.id === 'zhongcai-history' ? 'eager' : 'lazy'; image.decoding = 'async';
    image.addEventListener('error', () => { button.disabled = true; image.hidden = true; button.append(el('p', 'image-error', '图表暂不可用')); }, {once:true});
    button.append(image); button.addEventListener('click', () => openChart(chart, button));
    const caption = el('figcaption'); caption.append(el('span', '', chart.title), el('span', 'chart-date', chart.dateLabel));
    figure.append(button, caption);
    if (chart.note) figure.append(el('p', 'chart-note', chart.note));
    return figure;
  }
  function tableNode(block) {
    const container = el(block.collapsed ? 'details' : 'div', 'table-block'); container.id = block.id;
    if (block.collapsed) {
      const summary = el('summary', '', block.title); summary.append(el('span', 'row-count', `${block.rows.length} 项`)); container.append(summary);
    } else container.append(el('h3', '', block.title));
    const scroller = el('div', 'table-scroll'); scroller.tabIndex = 0; scroller.setAttribute('role', 'region'); scroller.setAttribute('aria-label', block.title);
    const table = el('table', 'data-table');
    const head = el('thead'); const headerRow = el('tr');
    block.headers.forEach(title => {const th = el('th', '', title); th.scope = 'col'; headerRow.append(th);}); head.append(headerRow);
    const body = el('tbody');
    block.rows.forEach((row, index) => {
      const tr = el('tr', (block.totals || []).includes(index) ? 'total-row' : '');
      row.forEach(value => {
        const cell = el('td', /^[+]\d/.test(value) ? 'positive' : /^-\d/.test(value) ? 'negative' : '', value);
        tr.append(cell);
      }); body.append(tr);
    });
    table.append(head, body); scroller.append(table); container.append(scroller);
    if (block.note) container.append(el('p', 'table-note', block.note));
    return container;
  }
  data.sections.forEach((section, index) => {
    const node = el('section', 'section'); node.id = section.id;
    const heading = el('header', 'section-heading');
    heading.append(el('h2', '', section.title), el('span', '', `${String(index + 1).padStart(2, '0')} / ${section.date}`));
    node.append(heading);
    section.blocks.forEach(block => {
      if (block.type === 'charts') {
        const group = el('div', `chart-grid${block.ids.length === 1 ? ' single' : ''}`);
        block.ids.forEach(id => group.append(chartNode(chartMap.get(id)))); node.append(group);
      } else if (block.type === 'table') node.append(tableNode(block));
      else if (block.type === 'metrics') node.append(metrics(block.items));
      else if (block.type === 'note') node.append(el('p', 'section-note', block.text));
      else if (block.type === 'conclusions') {
        const conclusions = el('div', 'conclusions');
        if (block.title) conclusions.append(el('h3', '', block.title));
        const list = el('ul'); block.items.forEach(item => list.append(el('li', '', item))); conclusions.append(list); node.append(conclusions);
      }
    });
    document.getElementById('sections').append(node);
  });
  document.getElementById('zoom-in').addEventListener('click', () => applyZoom(zoom * 1.5));
  document.getElementById('zoom-out').addEventListener('click', () => applyZoom(zoom / 1.5));
  document.getElementById('zoom-fit').addEventListener('click', fit);
  document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {const r = viewer.getBoundingClientRect(); if (event.target === viewer && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) viewer.close();});
  viewer.addEventListener('close', () => {document.body.style.overflow = ''; viewerImage.removeAttribute('src'); opener?.focus();});
  window.addEventListener('resize', () => {if (viewer.open) fit();});
})();
