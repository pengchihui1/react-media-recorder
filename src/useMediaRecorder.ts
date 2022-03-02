import {useCallback, useEffect, useRef, useState} from "react";

interface Params {
  audio?: boolean;
  video?: boolean;
  screen?: boolean;
  askPermissionOnMount?: boolean;
}

const useMediaRecorder = (params: Params) => {
  const {
    audio = true,
    video = false,
    screen = false,
    askPermissionOnMount = false,
  } = params;

  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const mediaStream = useRef<MediaStream>();
  const audioStream = useRef<MediaStream>();
  const mediaRecorder = useRef<MediaRecorder>();
  const mediaBlobs = useRef<Blob[]>([]);

  const getMediaStream = useCallback(async () => {
    if (screen) {
      mediaStream.current = await navigator.mediaDevices.getDisplayMedia({ video: true });
      mediaStream.current?.getTracks()[0].addEventListener('ended', () => {
        stopRecord()
      })
      if (audio) {
        audioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioStream.current?.getAudioTracks().forEach(audioTrack => mediaStream.current?.addTrack(audioTrack));
      }
    } else {
      mediaStream.current = await navigator.mediaDevices.getUserMedia(({ video, audio }))
    }
  }, [screen, video, audio])

  const toggleMute = (isMute: boolean) => {
    mediaStream.current?.getAudioTracks().forEach(track => track.enabled = !isMute);
    audioStream.current?.getAudioTracks().forEach(track => track.enabled = !isMute)
    setIsMuted(isMute);
  }

  const startRecord = async () => {
    await getMediaStream();

    mediaRecorder.current = new MediaRecorder(mediaStream.current!);
    mediaRecorder.current.ondataavailable = (blobEvent) => {
      mediaBlobs.current.push(blobEvent.data);
    }
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(mediaBlobs.current, { type: 'audio/wav' })
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
    }

    mediaRecorder.current?.start();
  }

  const pauseRecord = async () => {
    mediaRecorder.current?.pause();
  }

  const resumeRecord = async () => {
    mediaRecorder.current?.resume()
  }

  const stopRecord = async () => {
    mediaRecorder.current?.stop()
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    mediaBlobs.current = [];
  }

  useEffect(() => {
    if (askPermissionOnMount) {
      getMediaStream().then();
    }
  }, [audio, screen, video, getMediaStream, askPermissionOnMount])

  return {
    mediaUrl,
    startRecord,
    pauseRecord,
    resumeRecord,
    stopRecord,
    getMediaStream: () => mediaStream.current,
    getAudioStream: () => audioStream.current,
    toggleMute,
    isMuted,
    clearBlobUrl: () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
      setMediaUrl('');
    }
  }
}

export default useMediaRecorder;
