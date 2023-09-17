/* eslint-disable no-useless-escape */
import {storageHost, inappPreviewHost} from './constants';

const queue = [];
let running = false;
let f;

const next = () => {
  /** Unshift the queue to generate the next preview */
  const {url, ext, type, width, height, resolve, reject} = queue.shift();
  generatePreview(url, ext, type, width, height, resolve, reject);
};

export const generatePreview = async (url, ext, type, width, height, resolve, reject) => {
  const previewHost = inappPreviewHost;
  running = true;
  // check for existing iframe
  var iframe = document.querySelector(`iframe[src^="${previewHost}/screenshot.html"]`);

  // else create new iframe
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.width = '0px';
    iframe.height = '0px';
    document.body.appendChild(iframe);
  }

  // check either first param is url or hash
  if (!isValidURL(url)) {
    url = `${storageHost}/${url}/preview.${ext}`;
  }

  // create URL
  var ssUrl = `${previewHost}/screenshot.html?url=${url}&ext=${ext}&type=${type}&width=${width}&height=${height}`;

  // set src attr for iframe
  iframe.src = ssUrl;
  console.log('Preview generation in progress for ', ssUrl);
  // event listener for postMessage from screenshot.js
  const rejection = setTimeout(() => {
    reject('Preview Server Timed Out');
    running = false;
    /** discard old function */
    window.removeEventListener('message', f, false);
    if (queue.length > 0) {
      next();
    }
  }, 30 * 1000);

  f = event => {
    if (event.data.method === 'result') {
      window.removeEventListener('message', f, false);
      let blob;
      if (type === 'webm') {
        blob = new Blob([event.data.result], {
          type: `video/${type}`,
        });
      } else {
        blob = new Blob([event.data.result], {
          type: `image/${type}`,
        });
      }
      clearTimeout(rejection);
      resolve({
        blob: blob,
        url: URL.createObjectURL(blob),
      });
      running = false;
      if (queue.length > 0) {
        next();
      }
    }
  };
  window.addEventListener('message', f);
};

// URL validate function
function isValidURL(string) {
  var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
  return (res !== null);
}

export const preview = async (url, ext, type, width, height, priority=10) => {
  return new Promise((resolve, reject) => {
    if (!['png', 'jpg', 'jpeg', 'vox', 'vrm', 'glb', 'webm', 'gif'].includes(ext)) {
      return reject('Undefined Extension');
    }
    if (!running) {
      generatePreview(url, ext, type, width, height, resolve, reject);
    } else {
      queue.push({url, ext, type, width, height, resolve, reject, priority});
      queue.sort((a, b) => a.priority - b.priority)
    }
  });
};
