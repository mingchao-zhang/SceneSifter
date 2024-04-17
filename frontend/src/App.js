import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [videoData, setVideoData] = useState([]);
  const videoRefs = useRef(new Map());
  const [keywords, setKeywords] = useState('');

  const handleFileChange = (event) => {
    // const file = event.target.files[0];
    // if (file) {
    //   setSelectedFile(file);
    //   setFileName(file.name);
    // } else {
    //   setSelectedFile(null);
    //   setFileName('');
    // }
    const files = event.target.files;
    if (files.length > 0) {
      setSelectedFile(files);
      const fileNames = Array.from(files).map((file) => file.name).join(', ');
      setFileName(fileNames);
    } else {
      setSelectedFile(null);
      setFileName('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first!');
      return;
    }
    // const formData = new FormData();
    // formData.append('video', selectedFile);
    const formData = new FormData();
    // Loop through each selected file and append it to formData
    for (let i = 0; i < selectedFile.length; i++) {
      formData.append('video', selectedFile[i]);
    }
    

    try {
      const response = await fetch('http://localhost:5001/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert('Upload successful: ' + result.message);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading the file', error);
      alert('Error uploading the file');
    }
  };

  const handleKeywordsChange = (event) => {
    setKeywords(event.target.value);
  };

  const handleQuery = async () => {
    try {
      const response = await fetch('http://localhost:5001/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: keywords }),
      });
      if (response.ok) {
        const data = await response.json();
        setVideoData(data.videos);
        alert('Query succeeded');
      }
    } catch (error) {
      console.error('Error during query', error);
      alert('Error during query');
    }
  };

  const seekTo = (videoName, startTime) => {
    const video = videoRefs.current.get(videoName);
    if (video) {
      video.currentTime = startTime;
    }
  };

  return (
    <div className="App">
      <header className="header-background">
        <div className="header-icon"></div>
        <h1 className="app-title">SceneSifter</h1>
        <div></div> 
      </header>

      <div className="App-header">
        <input type="file" onChange={handleFileChange} accept="video/*" multiple />
        <button onClick={handleUpload}>Upload Video</button>
        {fileName && <p>Selected file: {fileName}</p>}

        <input 
          type="text" 
          value={keywords} 
          onChange={handleKeywordsChange} 
          placeholder="Enter keywords..." 
        />
        <button onClick={handleQuery}>Search Videos</button>
      </div>
      {/* Display relevant videos */}
      {videoData.map((video, index) => (
        <div key={index} className="video-item">
          <h2>{video.videoName}</h2>
          <video
            ref={(el) => videoRefs.current.set(video.videoName, el)}
            width="640"
            controls
          >
            <source src={video.videoPath} type="video/mp4" />
            This video is not supported by the current browser.
          </video>
          {/* Display start times that are relevant to the search word */}
          <ul>
            {video.startTimes.map((startTime, idx) => (
              <li key={idx}>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  seekTo(video.videoName, startTime); 
                }}>
                  {startTime}s - {video.descriptions[idx]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default App;