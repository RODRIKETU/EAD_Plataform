let hlsInstance = null;

function playVideo(m3u8Url) {
    const video = document.getElementById('video-player');
    const container = document.getElementById('video-container');

    container.classList.remove('hidden');

    if (Hls.isSupported()) {
        if (hlsInstance) {
            hlsInstance.destroy();
        }
        hlsInstance = new Hls();
        hlsInstance.loadSource(m3u8Url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play().catch(e => console.log('Autoplay blocked:', e));
        });
    }
    // hls.js is not supported on platforms that do not have Media Source Extensions (MSE) enabled.
    // When the browser has built-in HLS support (check using `canPlayType`), we can provide an HLS manifest (i.e. .m3u8 URL) directly to the video element through the `src` property.
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = m3u8Url;
        video.addEventListener('loadedmetadata', function () {
            video.play().catch(e => console.log('Autoplay blocked:', e));
        });
    }
}
