const https = require('https');
const { makeAPICall } = require('../../lib/api/client');

jest.mock('https');

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('makeAPICall', () => {
    it('should make successful API call', async () => {
      const mockResponse = { result: 'success', data: 'test' };
      
      https.request.mockImplementation((options, callback) => {
        const res = {
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify(mockResponse));
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        callback(res);
        return { 
          on: jest.fn(), 
          end: jest.fn(),
          write: jest.fn()
        };
      });

      const result = await makeAPICall({ 
        method: 'GET',
        path: '/api/list' 
      });
      
      expect(result).toEqual(mockResponse);
      expect(result.result).toBe('success');
    });

    it('should handle network errors', async () => {
      https.request.mockImplementation((options, callback) => {
        const req = {
          on: jest.fn((event, handler) => {
            if (event === 'error') {
              handler(new Error('Network error'));
            }
          }),
          end: jest.fn(),
          write: jest.fn()
        };
        return req;
      });

      const result = await makeAPICall({ path: '/api/test' });
      
      expect(result.result).toBe('error');
      expect(result.message).toContain('Network error');
    });

    it('should parse JSON responses correctly', async () => {
      const complexResponse = {
        result: 'success',
        files: [
          { path: 'index.html', size: 1024 },
          { path: 'style.css', size: 512 }
        ]
      };

      https.request.mockImplementation((options, callback) => {
        const res = {
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify(complexResponse));
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        callback(res);
        return { on: jest.fn(), end: jest.fn(), write: jest.fn() };
      });

      const result = await makeAPICall({ path: '/api/list' });
      
      expect(result.files).toHaveLength(2);
      expect(result.files[0].path).toBe('index.html');
    });

    it('should handle invalid JSON gracefully', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = {
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler('Invalid JSON {]');
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        callback(res);
        return { on: jest.fn(), end: jest.fn(), write: jest.fn() };
      });

      const result = await makeAPICall({ path: '/api/test' });
      
      expect(result.result).toBe('error');
      expect(result.message).toContain('Invalid JSON');
    });

    it('should handle FormData streams', async () => {
      const mockFormData = {
        pipe: jest.fn()
      };

      https.request.mockImplementation((options, callback) => {
        const res = {
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify({ result: 'success' }));
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        callback(res);
        return { 
          on: jest.fn(), 
          end: jest.fn(),
          write: jest.fn()
        };
      });

      const result = await makeAPICall(
        { path: '/api/upload' }, 
        mockFormData
      );
      
      expect(mockFormData.pipe).toHaveBeenCalled();
      expect(result.result).toBe('success');
    });

    it('should add authorization header when API key provided', async () => {
      process.env.NEOCITIES_API_KEY = 'test-api-key';
      
      let capturedOptions;
      https.request.mockImplementation((options, callback) => {
        capturedOptions = options;
        const res = {
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler(JSON.stringify({ result: 'success' }));
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        callback(res);
        return { on: jest.fn(), end: jest.fn(), write: jest.fn() };
      });

      await makeAPICall({ path: '/api/test' });
      
      expect(capturedOptions.headers.Authorization).toBe('Bearer test-api-key');
      
      delete process.env.NEOCITIES_API_KEY;
    });
  });
});
