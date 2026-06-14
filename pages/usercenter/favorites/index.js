const app = getApp();

Page({
  data: {
    favorites: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onShow() {
    this.loadFavorites(true);
  },

  onPullDownRefresh() {
    this.loadFavorites(true);
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadFavorites(false);
    }
  },

  // 加载收藏列表
  loadFavorites(refresh) {
    const that = this;
    if (this.data.loading) return;

    const db = app.globalData.db;
    if (refresh) {
      this.setData({ page: 1, hasMore: true, favorites: [] });
    }

    this.setData({ loading: true });

    db.collection('favorites')
      .orderBy('createTime', 'desc')
      .skip(((refresh ? 1 : this.data.page) - 1) * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const favList = res.data;
        const hasMore = favList.length >= that.data.pageSize;

        if (favList.length === 0) {
          that.setData({ loading: false, hasMore: false });
          return;
        }

        // 根据 productId 批量获取商品详情
        const productIds = favList.map(f => f.productId);
        that.fetchProductsByIds(productIds, favList, refresh);
      })
      .catch(err => {
        console.error(err);
        that.setData({ loading: false });
      });
  },

  // 批量获取商品详情
  fetchProductsByIds(productIds, favList, refresh) {
    const that = this;

    // 使用云函数逐个获取（简单方案）或批量查询
    const promises = productIds.map(id => {
      return wx.cloud.callFunction({
        name: 'getProductDetail',
        data: { productId: id }
      }).then(res => {
        const result = res.result || {};
        return result.code === 0 ? result.data : null;
      }).catch(() => null);
    });

    Promise.all(promises).then(products => {
      const validProducts = products.filter(p => p !== null).map(p => app.sanitizeProductImages(p));
      const favorites = refresh ? validProducts : that.data.favorites.concat(validProducts);

      that.setData({
        favorites,
        page: (refresh ? 1 : that.data.page) + 1,
        hasMore: favList.length >= that.data.pageSize,
        loading: false
      });
    }).catch(() => {
      that.setData({ loading: false });
    });
  },

  // 取消收藏
  removeFav(e) {
    const that = this;
    const productId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '取消收藏',
        content: '确定要取消收藏吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'toggleFavorite',
            data: { productId }
          }).then(res => {
            const result = res.result || {};
            if (result.code === 0) {
              wx.showToast({ title: '已取消收藏', icon: 'none' });
              that.loadFavorites(true);
            }
          });
        }
      }
    });
  },

  // 图片加载失败回退
  onImageError(e) {
    var index = e.currentTarget.dataset.index;
    var key = 'favorites[' + index + '].coverImage';
    this.setData({ [key]: '' });
  },

  // 去详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/goods/details/index?id=' + id });
  }
});