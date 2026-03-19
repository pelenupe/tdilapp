const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const uploadFile = async (file) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${uuidv4()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location; // URL of uploaded file
};

module.exports = { uploadFile };
