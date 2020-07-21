(() => {
  let socket;
  let mediaRecorder;
  let btnRec;
  let btnStop;
  let info;

  const showMessage = message => {
    info.innerHTML = message;
  };

  const UI =
    '<div' +
    '  style="position: fixed; bottom: 0; left: 0; z-index: 99999; background-color: #323bad; width: 400px; height: 100px;"' +
    '>' +
    '  <div style="margin: 10px;">' +
    '    <p>Webcam Recorder</p>' +
    '    <div class="wcs-info" style="padding-bottom: 10px;"></div>' +
    '    <button class="wcs-btn-rec" disabled>Record</button>' +
    '    <button class="wcs-btn-stop" disabled>Stop</button>' +
    '  </div>' +
    '</div>';

  const getOptions = () => {
    let options = { mimeType: 'video/webm;codecs=vp9,opus' };

    if (!window.MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not supported`);
      options = { mimeType: 'video/webm;codecs=vp8,opus' };

      if (!window.MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not supported`);
        options = { mimeType: 'video/webm' };

        if (!window.MediaRecorder.isTypeSupported(options.mimeType)) {
          console.error(`${options.mimeType} is not supported`);
          options = { mimeType: '' };
        }
      }
    }

    return options;
  };

  const wireUpUI = () => {
    const body = document.querySelector('body');
    const existingUI = body.querySelector('#webcam-recorder-322f3fde');

    if (existingUI) {
      body.removeChild(existingUI);
    }

    body.insertAdjacentHTML('beforeend', UI);

    btnRec = document.querySelector('.wcs-btn-rec');
    btnStop = document.querySelector('.wcs-btn-stop');
    info = document.querySelector('.wcs-info');

    if (!hasCapabilities()) {
      showMessage('MediaRecorder API not supported or no video on page');
      return;
    }

    showMessage('Waiting for socket..');

    btnRec.onclick = () => {
      initRecorder();

      if (mediaRecorder) {
        socket.send(
          JSON.stringify({
            type: 'CREATE_FILE',
            data: getFilename(),
          }),
        );
        mediaRecorder.start(0);
        btnRec.disabled = true;
        btnStop.disabled = false;
      }
    };

    btnStop.onclick = () => {
      btnRec.disabled = false;
      btnStop.disabled = true;

      socket.send(
        JSON.stringify({
          type: 'STOP_RECORDING',
          data: null,
        }),
      );

      if (mediaRecorder) mediaRecorder.stop();
    };
  };

  const hasCapabilities = () => {
    return document.querySelector('video') && window.MediaRecorder;
  };

  const initRecorder = () => {
    const video = document.querySelector('video');

    if (!video) {
      showMessage('Error: No video in page');
      mediaRecorder = null;
      return;
    }

    const stream = video.captureStream();
    const options = getOptions();

    if (mediaRecorder) {
      try {
        if (mediaRecorder.readyState !== 'inactive') {
          mediaRecorder.stop();
        }
        mediaRecorder.ondataavailable = null;
      } catch (e) {
        //
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder
    mediaRecorder = new window.MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0 && socket.readyState === 1) {
        socket.send(e.data);
      }
    };
  };

  const initSocket = () => {
    socket = new window.WebSocket('ws://localhost:1337');

    socket.onopen = () => {
      document.querySelector('.wcs-info').innerHTML = getFilename();
      document.querySelector('.wcs-btn-rec').disabled = false;
    };

    socket.onerror = e => {
      console.log(e);
    };

    socket.onclose = () => {
      document.querySelector('.wcs-btn-rec').disabled = true;
      document.querySelector('.wcs-info').innerHTML = 'Socket closed';
      setTimeout(initSocket, 2000);
    };
  };

  const getFilename = () => {
    const pathname = window.location.pathname.replace(/\//g, '.');
    const hostname = `${window.location.hostname}`;
    const timestamp = new Date()
      .toISOString()
      .split('.')[0]
      .replace(/:/g, '.');
    return `${hostname}${pathname}.${timestamp}`;
  };

  wireUpUI();

  if (hasCapabilities()) {
    initRecorder();
    initSocket();
  }
})();
