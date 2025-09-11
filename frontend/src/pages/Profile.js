import React, { useState, useEffect } from "react";

export default function Profile({ user }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  // Fetch existing profile photo on mount
  useEffect(() => {
    fetch(`http://localhost:5000/api/auth/user/${user.userId}`)
      .then((res) => res.json())
      .then((data) => setProfilePic(data.profilePic || null));
  }, [user.userId]);

  // Update preview whenever a new file is selected
  useEffect(() => {
    if (!file) return setPreview(null);

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl); // cleanup
  }, [file]);

  // Upload selected photo
  const uploadPhoto = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch(
      `http://localhost:5000/api/auth/user/${user.userId}/photo`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    setProfilePic(data.profilePic);
    setFile(null);
    setPreview(null);
  };

  // Remove current photo or clear preview
  const removePhoto = async () => {
    if (profilePic) {
      await fetch(`http://localhost:5000/api/auth/user/${user.userId}/photo`, {
        method: "DELETE",
      });
    }
    setProfilePic(null);
    setFile(null);
    setPreview(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Profile Settings</h2>

      {/* Show either existing profilePic or preview */}
      {profilePic && !preview && (
        <img src={profilePic} alt="Profile" width={100} />
      )}
      {preview && <img src={preview} alt="Preview" width={100} />}

      <div style={{ marginTop: "10px" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={uploadPhoto} disabled={!file}>
          Upload
        </button>
        {(profilePic || preview) && (
          <button onClick={removePhoto}>Remove Photo</button>
        )}
      </div>
    </div>
  );
}
