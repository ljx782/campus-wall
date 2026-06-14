const app = getApp();

Page({
  data: {
    item: null,
    showContact: false,
    isFaved: false,
    navigation: { type: 'fraction' },
    current: 0,
    itemId: '',
    isOwner: false,
    loading: true
  },

  onLoad: function (options) {
    const id = options.id || '';
    if (!id) {
      wx.showToast({ title: '内容不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ itemId: id });
    this.loadDetail(id);
    this.checkFavorite(id);
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      if (tabBar) tabBar.init();
    }
  },

  loadDetail(id) {
    const that = this;
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getProductDetail',
      data: { productId: id }
    }).then(res => {
      const result = res.result || {};
      if (result.code === 0 && result.data) {
        const item = app.sanitizeProductImages(result.data);
        if (!item.publisher) {
          item.publisher = { nickname: '未知', avatar: '', wechat: '', phone: '', dorm: '' };
        }
        const isOwner = app.globalData.openid && item._openid === app.globalData.openid;
        that.setData({ item, isOwner, loading: false });
      } else {
        wx.showToast({ title: result.msg || '内容不存在', icon: 'none' });
        that.setData({ loading: false });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    }).catch(err => {
      console.error('加载详情失败:', err);
      that.setData({ loading: false });
      wx.showToast({ title: '加载失败，请检查云函数是否已部署', icon: 'none', duration: 3000 });
    });
  },

  checkFavorite(productId) {
    const db = app.globalData.db;
    if (!db) return;
    db.collection('favorites').where({ productId }).get().then(res => {
      if (res.data.length > 0) this.setData({ isFaved: true });
    }).catch(() => {});
  },

  toggleContact() {
    if (!this.data.item || !this.data.item.publisher) {
      wx.showToast({ title: '卖家信息暂不可用', icon: 'none' });
      return;
    }
    this.setData({ showContact: !this.data.showContact });
  },

  copyWechat() {
    const publisher = this.data.item && this.data.item.publisher;
    if (!publisher || !publisher.wechat) {
      wx.showToast({ title: '微信号暂未填写', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: publisher.wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    });
  },

  callPhone() {
    const publisher = this.data.item && this.data.item.publisher;
    const phone = publisher ? (publisher.phoneRaw || publisher.phone || '') : '';
    const cleanPhone = phone.replace(/\*/g, '');
    if (cleanPhone.length === 11) {
      wx.makePhoneCall({ phoneNumber: cleanPhone });
    } else {
      wx.showToast({ title: '电话号码不完整', icon: 'none' });
    }
  },

  toggleFav() {
    const that = this;
    wx.cloud.callFunction({
      name: 'toggleFavorite',
      data: { productId: this.data.itemId }
    }).then(res => {
      const result = res.result || {};
      if (result.code === 0) {
        that.setData({ isFaved: result.favorited });
        wx.showToast({ title: result.msg, icon: 'none' });
      }
    }).catch(err => {
      console.error('收藏失败:', err);
      wx.showToast({ title: '收藏失败，请检查云函数是否已部署', icon: 'none', duration: 3000 });
    });
  },

  // 头像加载失败回退
  onAvatarError() {
    this.setData({ 'item.publisher.avatar': '/images/default-avatar.png' });
  },

  showCurImg(e) {
    const item = this.data.item;
    if (!item || !item.images || item.images.length === 0) return;
    const index = e.detail.index || 0;
    wx.previewImage({
      current: item.images[index] || item.images[0],
      urls: item.images
    });
  },

  onShareAppMessage() {
    const item = this.data.item;
    return {
      title: item ? item.title : '师闲物',
      path: '/pages/goods/details/index?id=' + this.data.itemId
    };
  }
});