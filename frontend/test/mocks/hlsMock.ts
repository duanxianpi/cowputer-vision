class HlsMock {
  static Events = {
    MEDIA_ATTACHED: "MEDIA_ATTACHED",
    MANIFEST_PARSED: "MANIFEST_PARSED",
    FRAG_CHANGED: "FRAG_CHANGED",
  };

  static isSupported() {
    return true;
  }

  on() {}
  attachMedia() {}
  loadSource() {}
  destroy() {}
}

export default HlsMock;
