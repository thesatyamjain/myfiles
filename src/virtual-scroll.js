// src/virtual-scroll.js - Zero-Dependency Virtual Windowing Engine for MyFiles
// Ensures 60 FPS smooth scrolling with directories containing 10,000+ files
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VirtualScroller = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class VirtualScroller {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.viewport - The scrollable container
     * @param {number} options.totalItems - Total item count
     * @param {number} options.itemHeight - Height of a single row or card in px
     * @param {number} [options.itemsPerRow=1] - Number of columns (1 for list, >1 for grid)
     * @param {number} [options.overscan=6] - Buffer rows rendered above and below viewport
     * @param {number} [options.threshold=100] - Minimum items before virtualization kicks in
     * @param {Function} options.renderItem - Callback(index) returning HTMLElement
     */
    constructor(options) {
      this.viewport = options.viewport;
      this.totalItems = options.totalItems || 0;
      this.itemHeight = options.itemHeight || 32;
      this.itemsPerRow = Math.max(1, options.itemsPerRow || 1);
      this.overscan = options.overscan !== undefined ? options.overscan : 6;
      this.threshold = options.threshold || 100;
      this.renderItem = options.renderItem;

      this.contentWrapper = null;
      this.topSpacer = null;
      this.bottomSpacer = null;
      this.itemContainer = null;
      this.onScrollBound = this.onScroll.bind(this);
      this.rafId = null;
      this.isVirtual = this.totalItems > this.threshold;

      this.currentStart = -1;
      this.currentEnd = -1;

      this.init();
    }

    init() {
      if (!this.viewport) return;

      // If item count is small, render directly without virtualization overhead
      if (!this.isVirtual) {
        this.renderDirect();
        return;
      }

      this.contentWrapper = document.createElement('div');
      this.contentWrapper.className = 'virtual-scroll-wrapper';
      this.contentWrapper.style.position = 'relative';
      this.contentWrapper.style.width = '100%';

      this.topSpacer = document.createElement('div');
      this.topSpacer.className = 'virtual-spacer-top';
      this.topSpacer.style.width = '100%';

      this.itemContainer = document.createElement('div');
      this.itemContainer.className = 'virtual-item-container';
      if (this.itemsPerRow > 1) {
        this.itemContainer.style.display = 'grid';
      }

      this.bottomSpacer = document.createElement('div');
      this.bottomSpacer.className = 'virtual-spacer-bottom';
      this.bottomSpacer.style.width = '100%';

      this.contentWrapper.appendChild(this.topSpacer);
      this.contentWrapper.appendChild(this.itemContainer);
      this.contentWrapper.appendChild(this.bottomSpacer);
      this.viewport.appendChild(this.contentWrapper);

      this.viewport.addEventListener('scroll', this.onScrollBound, { passive: true });
      this.updateWindow();
    }

    renderDirect() {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < this.totalItems; i++) {
        const node = this.renderItem(i);
        if (node) frag.appendChild(node);
      }
      this.viewport.appendChild(frag);
    }

    onScroll() {
      if (this.rafId) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.updateWindow();
      });
    }

    updateWindow() {
      if (!this.viewport || !this.isVirtual) return;

      const scrollTop = this.viewport.scrollTop;
      const viewportHeight = this.viewport.clientHeight || 600;
      const totalRows = Math.ceil(this.totalItems / this.itemsPerRow);

      // Determine visible rows
      const startRow = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
      const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.overscan);

      const startIndex = startRow * this.itemsPerRow;
      const endIndex = Math.min(this.totalItems, endRow * this.itemsPerRow);

      // Skip re-rendering if slice hasn't shifted
      if (startIndex === this.currentStart && endIndex === this.currentEnd) {
        return;
      }

      this.currentStart = startIndex;
      this.currentEnd = endIndex;

      // Update spacers
      const topHeight = startRow * this.itemHeight;
      const bottomHeight = Math.max(0, (totalRows - endRow) * this.itemHeight);

      this.topSpacer.style.height = `${topHeight}px`;
      this.bottomSpacer.style.height = `${bottomHeight}px`;

      // Render only visible slice
      this.itemContainer.innerHTML = '';
      const frag = document.createDocumentFragment();
      for (let i = startIndex; i < endIndex; i++) {
        const node = this.renderItem(i);
        if (node) frag.appendChild(node);
      }
      this.itemContainer.appendChild(frag);
    }

    destroy() {
      if (this.viewport) {
        this.viewport.removeEventListener('scroll', this.onScrollBound);
      }
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  return VirtualScroller;
}));
