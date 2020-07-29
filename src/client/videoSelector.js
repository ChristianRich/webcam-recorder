export default class VideoSelector {
  constructor() {
    document.onkeydown = e => {
      this.checkKey(e);
    };

    document.onkeypress = e => {
      this.checkKey(e);
    };

    this.curr = -1;
    this.selected = this.getNextItem();
    this.videos = this.getVideos();
    this.moveNext();
  }

  getCurrentVideoTarget() {
    return this.selected;
  }

  addBorder(el) {
    if (!el || !el.style) return;
    el.style.border = '2px solid red';
  }

  removeBorder(el) {
    if (!el || !el.style) return;
    el.style.border = 'none';
  }

  getNextItem() {
    const videos = this.getVideos();

    if (videos.length === 0) {
      return null;
    }

    videos[this.curr + 1] ? this.curr++ : (this.curr = 0);
    return videos[this.curr];
  }

  moveNext() {
    const item = this.getNextItem();

    if (item) {
      if (this.selected) {
        this.removeBorder(this.selected);
      }

      this.addBorder(item);
      this.selected = item;
    }
  }

  checkKey(e) {
    switch (e.keyCode) {
      case 39:
        this.moveNext();
        break;
    }
  }

  /**
   * @returns {NodeList}
   */
  getVideos() {
    const videos = document.querySelectorAll('video');
    return Array.from(videos);
  }
}
