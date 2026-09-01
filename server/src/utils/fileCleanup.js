import fs from "fs/promises";


//used to delete local files if some error occurs
const deleteLocalFiles = async (files) => {
  if (!files) return;

  const fileArrays = Object.values(files);

  for (const fileArray of fileArrays) {
    for (const file of fileArray) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error("Failed to delete temporary file:", file.path);
      }
    }
  }
};

//used to delete hls after it is successfully uploaded on B2
const deleteLocalHLS = async (directoryPath) => {
  if (!directoryPath) return;

  try {
    await fs.rm(directoryPath, {
      recursive: true,
      force: true,
    });

    console.log(`Deleted Local directory: ${directoryPath}`);
  } catch (error) {
    console.error("Failed to delete Local directory:", directoryPath);
    throw error;
  }
};


export { deleteLocalFiles, deleteLocalHLS };