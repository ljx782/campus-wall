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
    currentFilter: 'all',
    feedList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 12
  },

  onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().init();
    }
  },

  onLoad() {
    this.loadFeed(true);
  },

  onPullDownRefresh() {
    this.loadFeed(true);
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadFeed(false);
    }
  },

  loadFeed(refresh) {
    const that = this;
    const { page, pageSize } = this.data;
    if (this.data.loading) return;

    if (refresh) {
      this.setData({ page: 1, hasMore: true, feedList: [] });
    }

    this.setData({ loading: true });

    // 同时请求二手商品和校园墙帖子
    const tasks = [
      wx.cloud.callFunction({
        name: 'getProducts',
        data: {
          page: refresh ? 1 : page,
          pageSize,
          status: 'on',
          sortBy: 'publishTime',
          sortOrder: 'desc'
        }
      }).catch(() => ({ result: { code: -1 } })),
      wx.cloud.callFunction({
        name: 'campusWall',
        data: {
          action: 'list',
          type: '',
          page: refresh ? 1 : page,
          pageSize,
          sortBy: 'publishTime',
          sortOrder: 'desc'
        }
      }).catch(() => ({ result: { code: -1 } }))
    ];

    Promise.all(tasks).then(([productRes, wallRes]) => {
      let products = [];
      let posts = [];

      if (productRes.result && productRes.result.code === 0) {
        products = (productRes.result.data.list || []).map(p => {
          const sanitized = app.sanitizeProductImages(p);
          return {
            ...sanitized,
            moduleType: 'secondhand',
            tagName: '好物推荐',
            badgeIcon: '🌟',
            title: p.title,
            desc: p.desc,
            timeAgo: timeAgo(p.publishTime)
          };
        });
      }

      if (wallRes.result && wallRes.result.code === 0) {
        const badgeMap = { confession: '💌', study: '📚', lostfound: '🔍' };
        const tagMap = { confession: '表白墙', study: '学习经验', lostfound: '失物招领' };
        posts = (wallRes.result.data.list || []).map(p => {
          const sanitized = app.sanitizeProductImages(p);
          return {
            ...sanitized,
            moduleType: p.type,
            tagName: tagMap[p.type] || '校园墙',
            badgeIcon: badgeMap[p.type] || '📌',
            title: p.title,
            desc: p.content || p.desc,
            timeAgo: timeAgo(p.publishTime)
          };
        });
      }

      const all = products.concat(posts).sort((a, b) => {
        return new Date(b.publishTime) - new Date(a.publishTime);
      });

      const combined = refresh ? all : that.data.feedList.concat(all);
      // 合并后再排序，保证时间序正确
      const newList = combined.sort((a, b) => {
        return new Date(b.publishTime) - new Date(a.publishTime);
      });

      const hasMore = (productRes.result && productRes.result.code === 0 && productRes.result.data.hasMore) ||
                      (wallRes.result && wallRes.result.code === 0 && wallRes.result.data.hasMore);

      that.setData({
        feedList: newList,
        page: (refresh ? 1 : page) + 1,
        hasMore,
        loading: false
      });
    }).catch(err => {
      console.error('加载失败:', err);
      that.setData({ loading: false });
    });
  },

  navToDetail(e) {
    const { id, module } = e.currentTarget.dataset;
    if (module === 'secondhand') {
      wx.navigateTo({ url: '/pages/goods/details/index?id=' + id });
    } else {
      wx.navigateTo({ url: '/pages/detail/index?id=' + id + '&type=' + module });
    }
  },

  // 图片加载失败回退
  onImageError(e) {
    var itemIndex = e.currentTarget.dataset.itemIndex;
    var imgIndex = e.currentTarget.dataset.imgIndex;
    var key = 'feedList[' + itemIndex + '].images[' + imgIndex + ']';
    this.setData({ [key]: '/images/demo1.png' });
  },

  // 头像加载失败回退
  onAvatarError(e) {
    var itemIndex = e.currentTarget.dataset.itemIndex;
    var key = 'feedList[' + itemIndex + '].publisher.avatar';
    this.setData({ [key]: '/images/default-avatar.png' });
  },

  goSearch() {
    wx.switchTab({ url: '/pages/search/index' });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/index' });
  }
});
