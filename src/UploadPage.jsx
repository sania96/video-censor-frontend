// frontend/src/UploadPage.jsx
import React, { useState } from 'react';
import axios from 'axios';

function UploadPage() {
  const [videoFile, setVideoFile] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [processedS3Key, setProcessedS3Key] = useState(''); // To store the S3 key

  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
    setUploadError('');
    setDownloadUrl(''); // Clear previous download URL
  };

  const handleUpload = async () => {
    if (!videoFile) {
      setUploadError("Please select a video!");
      return;
    }

    setIsProcessing(true);
    setUploadError('');
    setDownloadUrl('');
    setProcessedS3Key('');

    try {
      // Step 1: Get pre-signed URL for upload
      const { data: presignedData } = await axios.get(`http://localhost:8000/generate-presigned-upload-url?filename=${videoFile.name}`);
      const presignedUrl = presignedData.url;

      // Step 2: Upload directly to S3
      await axios.put(presignedUrl, videoFile, {
        headers: {
          'Content-Type': videoFile.type
        }
      });

      // Step 3: Tell backend to process and get the S3 key
      const { data: processResponse } = await axios.post('http://localhost:8000/upload', {
        file_name: videoFile.name,
      });

      setProcessedS3Key(processResponse.output_video_s3_key);
      alert("Video processed successfully!"); // Inform the user
    } catch (error) {
      console.error('Upload failed:', error);
      if (error.response) {
        setUploadError(`Error processing video: ${error.response.data?.message || error.response.statusText}`);
        console.error('Server response:', error.response.data);
      } else if (error.request) {
        setUploadError('Error connecting to the server.');
      } else {
        setUploadError('An unexpected error occurred.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!processedS3Key) {
      alert("No processed video available for download.");
      return;
    }

    try {
      const { data: downloadData } = await axios.get(`http://localhost:8000/download-s3-url?s3_key=${processedS3Key}`);
      setDownloadUrl(downloadData.url);
    } catch (error) {
      console.error("Error getting download URL:", error);
      alert("Failed to get download URL.");
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Upload Video for Censoring</h2>
      <input type="file" accept="video/mp4" onChange={handleFileChange} />
      <br /><br />
      <button onClick={handleUpload} disabled={isProcessing || !videoFile}>
        {isProcessing ? "Processing..." : "Upload & Process"}
      </button>

      {uploadError && (
        <div style={{ marginTop: '1rem', color: 'red' }}>
          {uploadError}
        </div>
      )}

      {processedS3Key && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Censored Video:</h3>
          <video
            src={`https://${BUCKET_NAME}.s3.amazonaws.com/${processedS3Key}`} // You can display the video directly from S3
            controls
            width="600"
          />
          <br />
          <button onClick={handleDownload} disabled={isProcessing || !processedS3Key}>
            Get Download Link
          </button>
          {downloadUrl && (
            <div style={{ marginTop: '1rem' }}>
              <a href={downloadUrl} download="processed_video.mp4">
                Download Processed Video
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Replace with your actual bucket name (it's better to fetch this from backend if needed)
const BUCKET_NAME = process.env.REACT_APP_AWS_S3_BUCKET_NAME || "your-s3-bucket-name";

export default UploadPage;