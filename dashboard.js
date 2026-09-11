'use strict';
(() => {
  const data = globalThis.RESEARCH_DASHBOARD;
  if (!data) { document.getElementById('edition').textContent = '研究数据暂不可用'; return; }
  const el = (tag, className = '', value = '') => {
    const node = document.createElement(tag); node.className = className; node.textContent = value; return node;
  };
  const displayTitle = title => title.replace(/^\d+(?:\.\d+)+\s+/, '').replace(/(\s×\s)\d+(?:\.\d+)+\s+/, '$1');
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
  const chartMap = new Map(data.charts.map(chart => [chart.id, {...chart, title: displayTitle(chart.title)}]));
  function chartNode(chart) {
    const figure = el('figure', `chart${chart.tall ? ' tall' : ''}`);
    figure.dataset.chartId = chart.id;
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
    if (Number.isFinite(chart.latestBasis) && Number.isFinite(chart.meanBasis)) {
      const stats = el('div', 'basis-stats');
      stats.append(el('span', '', `最新 ${chart.latestBasis > 0 ? '+' : ''}${chart.latestBasis.toFixed(2)}%`),
        el('span', '', `均值 ${chart.meanBasis > 0 ? '+' : ''}${chart.meanBasis.toFixed(2)}%`),
        el('span', '', `${chart.observations} 个交易日`));
      figure.append(stats);
    }
    if (chart.note) figure.append(el('p', 'chart-note', chart.note));
    return figure;
  }
  function tableNode(block) {
    const title = displayTitle(block.title);
    const container = el(block.collapsed ? 'details' : 'div', 'table-block'); container.id = block.id;
    if (block.collapsed) {
      const summary = el('summary', '', title); summary.append(el('span', 'row-count', `${block.rows.length} 项`)); container.append(summary);
    } else container.append(el('h3', '', title));
    const scroller = el('div', 'table-scroll'); scroller.tabIndex = 0; scroller.setAttribute('role', 'region'); scroller.setAttribute('aria-label', title);
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
  function basisGallery(block) {
    const container = el('div', 'basis-gallery');
    const toolbar = el('div', 'basis-toolbar');
    const label = el('label', '', '品种');
    const select = el('select'); select.id = 'basis-product'; select.setAttribute('aria-label', '基差品种');
    const all = el('option', '', '全部品种'); all.value = ''; select.append(all);
    block.ids.forEach(id => {const option = el('option', '', chartMap.get(id).title); option.value = id; select.append(option);});
    label.append(select);
    const counter = el('span', 'basis-count'); counter.setAttribute('aria-live', 'polite');
    const pager = el('div', 'basis-pager');
    function pageButton(id, title, icon) {
      const button = el('button'); button.id = id; button.type = 'button'; button.title = title; button.setAttribute('aria-label', title);
      const image = el('img'); image.src = `assets/${icon}.svg`; image.alt = ''; image.width = 20; image.height = 20; button.append(image); return button;
    }
    const previous = pageButton('basis-previous', '上一页品种', 'chevron-left');
    const next = pageButton('basis-next', '下一页品种', 'chevron-right');
    const pageNumber = el('output'); pageNumber.id = 'basis-page'; pageNumber.setAttribute('aria-label', '品种页码');
    pager.append(previous, pageNumber, next);
    toolbar.append(label, counter, pager);
    const grid = el('div', 'chart-grid basis-grid'); grid.setAttribute('aria-label', '各品种基差走势');
    let page = 0;
    function render() {
      const ids = select.value ? [select.value] : block.ids;
      const pages = Math.ceil(ids.length / block.pageSize);
      page = Math.max(0, Math.min(page, pages - 1));
      const visible = ids.slice(page * block.pageSize, (page + 1) * block.pageSize);
      grid.replaceChildren(...visible.map(id => chartNode(chartMap.get(id))));
      grid.classList.toggle('single', Boolean(select.value));
      counter.textContent = `${ids.length} 个品种`;
      pageNumber.value = `${page + 1} / ${pages}`;
      previous.disabled = page === 0; next.disabled = page >= pages - 1;
    }
    select.addEventListener('change', () => {page = 0; render();});
    previous.addEventListener('click', () => {page -= 1; render();});
    next.addEventListener('click', () => {page += 1; render();});
    container.append(toolbar, grid); render(); return container;
  }
  data.sections.forEach(section => {
    const node = el('section', 'section'); node.id = section.id;
    const heading = el('header', 'section-heading');
    heading.append(el('h2', '', displayTitle(section.title)), el('span', '', `数据截至 ${section.date}`));
    node.append(heading);
    section.blocks.forEach(block => {
      if (block.type === 'charts') {
        const group = el('div', `chart-grid${block.ids.length === 1 ? ' single' : ''}`);
        block.ids.forEach(id => group.append(chartNode(chartMap.get(id)))); node.append(group);
      } else if (block.type === 'basis-gallery') node.append(basisGallery(block));
      else if (block.type === 'table') node.append(tableNode(block));
      else if (block.type === 'metrics') node.append(metrics(block.items));
      else if (block.type === 'note') node.append(el('p', 'section-note', block.text));
      else if (block.type === 'conclusions') {
        const conclusions = el('div', 'conclusions');
        if (block.title) conclusions.append(el('h3', '', displayTitle(block.title)));
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
