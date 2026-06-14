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
    keyword: '',
    currentType: 'all',
    resultList: [],
    loading: false,
    hasSearched: false,
    hotKeywords: ['iPad', '考研', '雨伞', '教材', '自行车', '表白', '图书馆', '耳机']
  },

  onShow() {
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().init();
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  clearKeyword() {
    this.setData({ keyword: '', resultList: [], hasSearched: false });
  },

  tapHot(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    this.doSearch();
  },

  doSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入搜索内容', icon: 'none' });
      return;
    }
    this.setData({ loading: true, hasSearched: true, resultList: [] });
    this.searchData(keyword);
  },

  searchData(keyword) {
    const that = this;
    const tasks = [
      wx.cloud.callFunction({
        name: 'getProducts',
        data: { keyword, status: 'on', page: 1, pageSize: 100, sortBy: 'publishTime', sortOrder: 'desc' }
      }).catch(() => ({ result: { code: -1 } })),
      wx.cloud.callFunction({
        name: 'campusWall',
        data: { action: 'list', type: '', keyword, page: 1, pageSize: 100, sortBy: 'publishTime', sortOrder: 'desc' }
      }).catch(() => ({ result: { code: -1 } }))
    ];

    Promise.all(tasks).then(([productRes, wallRes]) => {
      let products = [];
      let posts = [];

      if (productRes.result && productRes.result.code === 0) {
        const list = productRes.result.data.list || [];
        // 客户端过滤
        const filtered = list.filter(p => {
          const text = (p.title + ' ' + (p.desc || '') + ' ' + (p.category || '')).toLowerCase();
          return text.includes(keyword.toLowerCase());
        });
        products = filtered.map(p => ({
          ...p,
          moduleType: 'secondhand',
          tagName: '好物推荐',
          badgeIcon: '🌟',
          title: p.title,
          desc: p.desc,
          timeAgo: timeAgo(p.publishTime)
        }));
      }

      if (wallRes.result && wallRes.result.code === 0) {
        const list = wallRes.result.data.list || [];
        const filtered = list.filter(p => {
          const text = (p.title + ' ' + (p.content || '') + ' ' + (p.desc || '') + ' ' + (p.toName || '') + ' ' + (p.fromName || '') + ' ' + (p.itemName || '') + ' ' + (p.location || '')).toLowerCase();
          return text.includes(keyword.toLowerCase());
        });
        const badgeMap = { confession: '💌', study: '📚', lostfound: '🔍' };
        const tagMap = { confession: '表白墙', study: '学习经验', lostfound: '失物招领' };
        posts = filtered.map(p => ({
          ...p,
          moduleType: p.type,
          tagName: tagMap[p.type] || '校园墙',
          badgeIcon: badgeMap[p.type] || '📌',
          title: p.title,
          desc: p.content || p.desc,
          timeAgo: timeAgo(p.publishTime)
        }));
      }

      const all = products.concat(posts).sort((a, b) => {
        return new Date(b.publishTime) - new Date(a.publishTime);
      });

      that.setData({ resultList: all, loading: false });
    }).catch(err => {
      console.error('搜索失败:', err);
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
  }
});
