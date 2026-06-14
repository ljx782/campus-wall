const app = getApp();

function timeAgo(date) {
  if (!date) return '未知时间';
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return Math.floor(diff / minute) + '分钟前';
  if (diff < day) return Math.floor(diff / hour) + '小时前';
  if (diff < 7 * day) return Math.floor(diff / day) + '天前';
  return d.toLocaleDateString();
}

Page({
  data: {
    post: null,
    postType: '',
    tagName: '',
    tagIcon: '',
    timeAgo: '',
    loading: true,
    isLiked: false,
    contactInfo: ''
  },

  onLoad(options) {
    const { id, type } = options;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    this.setData({ postType: type || '' });
    this.loadDetail(id, type);
  },

  loadDetail(id, type) {
    const that = this;
    this.setData({ loading: true });

    if (type === 'secondhand') {
      wx.cloud.callFunction({
        name: 'getProductDetail',
        data: { productId: id }
      }).then(res => {
        const result = res.result || {};
        if (result.code === 0) {
          that.setPostData(result.data, 'secondhand');
        } else {
          that.setData({ post: null, loading: false });
        }
      }).catch(() => {
        that.setData({ post: null, loading: false });
      });
    } else {
      wx.cloud.callFunction({
        name: 'campusWall',
        data: { action: 'detail', postId: id }
      }).then(res => {
        const result = res.result || {};
        if (result.code === 0) {
          that.setPostData(result.data, result.data.type || type);
        } else {
          that.setData({ post: null, loading: false });
        }
      }).catch(() => {
        that.setData({ post: null, loading: false });
      });
    }
  },

  setPostData(post, type) {
    const tagMap = { confession: '表白墙', secondhand: '好物推荐', study: '学习经验', lostfound: '失物招领' };
    const iconMap = { confession: '💌', secondhand: '🌟', study: '📚', lostfound: '🔍' };
    let contactInfo = '';
    if (post.publisher) {
      contactInfo = post.publisher.wechat || post.contact || '';
    }
    // 检查当前用户是否已点赞
    const openid = app.globalData.openid || '';
    const isLiked = openid && post.likedOpenids && post.likedOpenids.includes(openid);

    // 清洗图片路径
    if (post.images && Array.isArray(post.images)) {
      post.images = post.images
        .map(function (img) { return app.sanitizeImageUrl(img); })
        .filter(Boolean);
    }

    this.setData({
      post,
      postType: type,
      tagName: tagMap[type] || '校园信息',
      tagIcon: iconMap[type] || '📌',
      timeAgo: timeAgo(post.publishTime),
      loading: false,
      contactInfo,
      isLiked
    });
  },

  toggleLike() {
    const post = this.data.post;
    if (!post || !post._id || this.data.postType === 'secondhand') return;
    const that = this;
    wx.cloud.callFunction({
      name: 'campusWall',
      data: { action: 'like', postId: post._id }
    }).then(res => {
      const result = res.result || {};
      if (result.code === 0) {
        that.setData({
          isLiked: result.liked,
          'post.likeCount': result.likeCount
        });
      }
    });
  },

  // 图片加载失败回退
  onImageError(e) {
    var imgIndex = e.currentTarget.dataset.imgIndex;
    var key = 'post.images[' + imgIndex + ']';
    this.setData({ [key]: '/images/demo1.png' });
  },

  // 头像加载失败回退
  onAvatarError() {
    this.setData({ 'post.publisher.avatar': '/images/default-avatar.png' });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.post.images || [];
    wx.previewImage({ current: url, urls });
  },

  copyContact() {
    const contact = this.data.contactInfo;
    if (!contact) return;
    wx.setClipboardData({
      data: contact,
      success() {
        wx.showToast({ title: '已复制联系方式', icon: 'success' });
      }
    });
  }
});
