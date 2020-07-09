const webcamRecorder = () => {
  let socket;
  let mediaRecorder;

  const state = {
    recording: false,
    filename: '',
  };

  const UI =
    '   <div id="websnatch" ' +
    '     style="position: absolute; top: 0; left: 0; z-index: 9999; background-color: grey; width: 400px; height: 100px;"  ' +
    '   >  ' +
    '     <div style="margin: 10px;">  ' +
    '       <div class="wcs-info" style="padding-bottom: 10px;">  ' +
    '         stripchat.com.mia_sense.2020-07-08T04:38:49.webm  ' +
    '       </div>  ' +
    '       <button class="wcs-btn-rec" disabled>Record</button>  ' +
    '       <button class="wcs-btn-stop" disabled>Stop</button>  ' +
    '     </div>  ' +
    '   </div>  ' +
    '    ';

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
    const existingUI = body.querySelector('#websnatch');
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
      console.log('onopen');

      socket.send(
        JSON.stringify({
          type: 'CREATE_FILE',
          data: getFilename(),
        }),
      );

      document.querySelector('.wcs-info').innerHTML = getFilename();
      document.querySelector('.wcs-btn-rec').disabled = false;
    };

    socket.onerror = () => {
      console.log('onerror');
    };

    socket.onclose = () => {
      console.log('onclose');
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
