const webcamRecorder = () => {
  let socket;
  let mediaRecorder;

  const state = {
    recording: false,
    filename: '',
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
    if (existingUI) body.removeChild(existingUI);
    body.insertAdjacentHTML('beforeend', UI);

    const btnRec = document.querySelector('.wcs-btn-rec');
    const btnStop = document.querySelector('.wcs-btn-stop');
    const info = document.querySelector('.wcs-info');

    if (hasCapabilities()) {
      info.innerHTML = 'Waiting for socket..';

      btnRec.onclick = () => {
        btnRec.disabled = true;
        btnStop.disabled = false;
        state.recording = true;

        socket.send(
          JSON.stringify({
            type: 'CREATE_FILE',
            data: getFilename(),
          }),
        );

        mediaRecorder.start(0);
      };

      btnStop.onclick = () => {
        btnRec.disabled = false;
        btnStop.disabled = true;
        state.recording = false;

        socket.send(
          JSON.stringify({
            type: 'STOP_RECORDING',
            data: null,
          }),
        );

        mediaRecorder.stop();
      };
    } else {
      info.innerHTML = 'Not supported';
    }
  };

  const hasCapabilities = () => {
    return document.querySelector('video') && window.MediaRecorder;
  };

  const initRecorder = () => {
    const video = document.querySelector('video');
    const stream = video.captureStream();
    const options = getOptions();

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
};

webcamRecorder();
