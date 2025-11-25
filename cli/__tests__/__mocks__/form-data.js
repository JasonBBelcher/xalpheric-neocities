class FormData {
  constructor() {
    this.data = {};
    this.append = jest.fn((key, value) => {
      this.data[key] = value;
    });
    this.getHeaders = jest.fn(() => ({
      'content-type': 'multipart/form-data; boundary=----FormDataBoundary'
    }));
  }
}

module.exports = FormData;
