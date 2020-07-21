# Live web cam to mp4 file recorder

Stream live web cam video to local mp4 video files. This code works by opening a web socket which will receive video blobs from the client which is streamed into a file.

This has only been tested on Mac OS Catalina using Google Chrome v83.

## Prerequisites

- ffmpeg https://ffmpeg.org/ (optional for webm > mp4 post capture conversion)
- node

## Install ffmpeg with Homebrew

```
brew uninstall ffmpeg

brew update
brew upgrade
brew cleanup

brew install ffmpeg --force
$ brew link ffmpeg
```

https://apple.stackexchange.com/questions/238295/installing-ffmpeg-with-homebrew

## Install

```
npm install
npm run build
npm start
```

## Capture video

First, build the code `npm run build`.
Start the server with `npm start` and let it wait for incoming web socket connections.

Go into the folder `/build/client` and copy the contents of the index file into Google Chrome console.
You should now see a user interface in the bottom left corner with a "Record" and a "Stop" button.

When you press "Record" the client will start streaming video blobs into a Node socket server and stream it to a file.

When you press "Stop" the recorder will stop and attempt to convert the webm file into an mp4 using ffmpeg.
If ffmpeg is not present on the system, the conversion is skipped and you're left with the webm file.

## TODO

- Allow the user to set a max recording time in the UI
- Display hh:mm:ss recorded in the UI
- Add a close button to the UI which will unregister the component and close the socket
- Add cancel button to UI which will delete the video from disk
- Create a Google Chrome extension for the client script
