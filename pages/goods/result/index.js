const app = getApp();

Page({
  data: {
    goodsList: [],
    keywords: '',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad(options) {
    const keywords = options.searchValue || '';
    this.setData({ keywords });
    if (keywords) {
      this.doSearch(keywords);
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.doSearch(this.data.keywords, false);
    }
  },

  doSearch(keywords, refresh = true) {
    const that = this;
    if (this.data.loading) return;

    if (refresh) {
      this.setData({ page: 1, hasMore: true, goodsList: [] });
    }

    this.setData({ loading: true, keywords });

    wx.cloud.callFunction({
      name: 'getProducts',
      data: {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        keyword: keywords,
        status: 'on',
        sortBy: 'publishTime',
        sortOrder: 'desc'
      }
    }).then(res => {
      const result = res.result || {};
      if (result.code === 0) {
        const newList = (result.data.list || []).map(item => app.sanitizeProductImages(item));
        const goodsList = refresh ? newList : that.data.goodsList.concat(newList);
        that.setData({
          goodsList,
          page: (refresh ? 1 : that.data.page) + 1,
          hasMore: result.data.hasMore,
          loading: false
        });
      } else {
        that.setData({ loading: false });
      }
    }).catch(err => {
      console.error(err);
      that.setData({ loading: false });
    });
  },

  handleSubmit(e) {
    const keywords = e.detail.value || '';
    if (keywords) {
      this.doSearch(keywords, true);
    }
  },

  // 图片加载失败回退
  onImageError(e) {
    var index = e.currentTarget.dataset.index;
    var key = 'goodsList[' + index + '].coverImage';
    this.setData({ [key]: '' });
  },

  gotoDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/goods/details/index?id=' + id });
  }
});