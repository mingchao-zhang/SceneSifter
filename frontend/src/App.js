import React, { useState, useRef } from "react";
import "./App.css";

function App() {
  const fileInputRef = useRef(null);
  // store file objects
  const [selectedFiles, setSelectedFiles] = useState([]); 
  // just store the file names
  const [uploadingFiles, setUploadingFiles] = useState([]); 
  const [videoData, setVideoData] = useState([]);
  const videoRefs = useRef(new Map());
  const [keywords, setKeywords] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      setSelectedFiles(Array.from(files));
    } else {
      setSelectedFiles([]);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await fetch("http://localhost:5001/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        // callback to remove file name from uploadingFiles
        removeFileFromUploading(file.name);
        console.log(file.name, " is successfully uploaded!")
      } else {
        console.error(`${file.name} upload failed`);
      }
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      alert("Please select files first!");
      return;
    }
    setUploadingFiles(selectedFiles.map((file) => file.name));

    selectedFiles.forEach((file) => {
      uploadFile(file);
    });
    // clear the selected files list once the upload begins
    setSelectedFiles([]);
  };

  const removeFileFromUploading = (fileName) => {
    setUploadingFiles((currentUploadingFiles) =>
      currentUploadingFiles.filter((name) => name !== fileName)
    );
  };

  const handleKeywordsChange = (event) => {
    setKeywords(event.target.value);
  };

  const handleQuery = async () => {
    setIsLoading(true);
    setVideoData([]);
    try {
      const response = await fetch("http://localhost:5001/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keywords: keywords }),
      });
      if (response.ok) {
        const data = await response.json();
        setVideoData(data.videos);
        console.log("Query succeeded!");
      }
    } catch (error) {
      console.error("Error during query", error);
      alert("Error during query");
    }
    setIsLoading(false);
  };

  const seekTo = (videoName, startTime) => {
    const video = videoRefs.current.get(videoName);
    if (video) {
      video.currentTime = startTime;
    }
  };

  const clearSearch = () => {
    setKeywords("");
  };

  const handleKeyDown = (event) => {
    // Check if the Enter key was pressed
    if (event.key === "Enter") {
      handleQuery();
    }
  };

  return (
    <div className="App">
      {/* loading overlay; displayed while waiting for responses */}
      {isLoading && (
        <div className="loading-overlay show">
          <div className="spinner"></div>
        </div>
      )}

      <header className="header-background">
        <div className="header-icon"></div>
        <h1 className="app-title">SceneSifter</h1>
        <div></div>
      </header>

      <div className="upload-box">
      <button onClick={() => fileInputRef.current.click()}>Select Videos</button>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        accept="video/*"
        style={{ display: 'none' }}
        ref={fileInputRef}
      />
      <button onClick={handleUpload}>Upload Videos</button>

      {/* list of files that have been selected but not yet uploaded */}
      {selectedFiles.length > 0 && (
        <div className="selected-files-list">
          {selectedFiles.map((file, index) => (
            <div key={index}>{file.name}</div>
          ))}
        </div>
      )}

      {/* list of files being uploaded with spinners */}
      {uploadingFiles.length > 0 && (
        <div className="uploading-list">
          {uploadingFiles.map((fileName, index) => (
            <div key={index} className="uploading-item">
              {fileName}
              <div className="uploading-spinner"></div>
            </div>
          ))}
        </div>
      )}
      </div>

      <div className="search-box">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            value={keywords}
            onChange={handleKeywordsChange}
            placeholder="Enter keywords..."
            onKeyDown={handleKeyDown}
          />
          {keywords && (
            <span className="clear-icon" onClick={clearSearch}>
              ✖️
            </span>
          )}
        </div>
        <button onClick={handleQuery}>Search</button>
      </div>

      <div className="video-listing">
        {videoData.map((video, index) => (
          <div key={index} className="video-item">
            <div className="video-title">{video.videoName}</div>
            <video
              ref={(el) => videoRefs.current.set(video.videoName, el)}
              controls
            >
              <source src={video.videoPath} type="video/mp4" />
              This video is not supported by the current browser.
            </video>
            {/* Display start times that are relevant to the search word */}
            <ul>
              {video.startTimes.map((startTime, idx) => (
                <li key={idx}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      seekTo(video.videoName, startTime);
                    }}
                  >
                    {startTime}s - {video.descriptions[idx]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
