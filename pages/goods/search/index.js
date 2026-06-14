Page({
  data: {
    historyWords: [],
    searchValue: ''
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ historyWords: history.slice(0, 20) });
  },

  saveHistory(keyword) {
    if (!keyword) return;
    let history = wx.getStorageSync('searchHistory') || [];
    history = history.filter(h => h !== keyword);
    history.unshift(keyword);
    if (history.length > 50) history = history.slice(0, 50);
    wx.setStorageSync('searchHistory', history);
  },

  deleteCurr(e) {
    const index = e.currentTarget.dataset.index;
    const historyWords = this.data.historyWords;
    historyWords.splice(index, 1);
    this.setData({ historyWords });
    wx.setStorageSync('searchHistory', historyWords);
  },

  handleClearHistory() {
    const that = this;
    wx.showModal({
      title: '确认',
      content: '确定要清空所有搜索历史吗？',
      success(res) {
        if (res.confirm) {
          that.setData({ historyWords: [] });
          wx.setStorageSync('searchHistory', []);
        }
      }
    });
  },

  handleHistoryTap(e) {
    const index = e.currentTarget.dataset.index;
    const keyword = this.data.historyWords[index] || '';
    if (keyword) {
      this.saveHistory(keyword);
      wx.navigateTo({
        url: '/pages/goods/result/index?searchValue=' + encodeURIComponent(keyword)
      });
    }
  },

  handleSubmit(e) {
    const value = e.detail ? (e.detail.value || '') : '';
    if (!value) return;
    this.saveHistory(value);
    wx.navigateTo({
      url: '/pages/goods/result/index?searchValue=' + encodeURIComponent(value)
    });
  }
});