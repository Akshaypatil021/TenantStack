# 🔑 TenantFlow SaaS Platform - Environment & AWS Credentials Guide

This guide documents all environment variables required by the **TenantFlow** platform, including step-by-step instructions for obtaining **AWS S3 Credentials** when transitioning storage from local disk to AWS S3 Cloud.

---

## 📋 Quick Reference: Required Environment Variables (`backend/.env`)

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Yes | `5000` | Express Backend Server port |
| `NODE_ENV` | Yes | `development` | Environment mode (`development` / `production`) |
| `MONGO_URI` | Yes | `mongodb://...` | MongoDB Atlas / Local connection URI |
| `JWT_SECRET` | Yes | `super_secret_key...` | Cryptographic secret for JWT token signing |
| `JWT_EXPIRES_IN` | Yes | `1d` | Token validity duration |
| `USE_AWS_S3` | No | `false` | Set to `true` to switch file uploads to AWS S3 Cloud |
| `AWS_REGION` | If S3 | `ap-south-1` | AWS S3 Bucket region |
| `AWS_ACCESS_KEY_ID` | If S3 | `AKIA...` | AWS IAM User Access Key |
| `AWS_SECRET_ACCESS_KEY` | If S3 | `wJalr...` | AWS IAM User Secret Key |
| `AWS_S3_BUCKET` | If S3 | `tenantflow-bucket` | Name of your S3 Bucket |
| `REDIS_HOST` | No | `localhost` | Redis server hostname for caching |
| `REDIS_PORT` | No | `6379` | Redis server port |

---

## ☁️ Step-by-Step Guide: How to Get AWS S3 Credentials

When you are ready to switch file uploads from local server storage to **AWS S3 Free Tier**, follow these 4 steps:

### Step 1: Create an AWS S3 Bucket
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/s3).
2. Go to **S3 Services** -> Click **Create Bucket**.
3. Enter a unique **Bucket Name** (e.g. `tenantflow-free-storage-2026`).
4. Select your preferred **AWS Region** (e.g. `ap-south-1` for Mumbai, or `us-east-1` for N. Virginia).
5. Leave other settings default and click **Create Bucket**.

### Step 2: Configure S3 CORS Policy (Required for Frontend Access)
1. Open your newly created S3 Bucket in the AWS Console.
2. Go to the **Permissions** tab.
3. Scroll down to **Cross-origin resource sharing (CORS)** and click **Edit**.
4. Paste the following JSON configuration and save:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:5000"],
    "ExposeHeaders": []
  }
]
```

### Step 3: Create AWS IAM User & Access Keys
1. Open [AWS IAM Console](https://console.aws.amazon.com/iam).
2. Go to **Users** -> Click **Add User**.
3. Enter username: `tenantflow-s3-user`.
4. Under Permissions, attach policy: **`AmazonS3FullAccess`**.
5. Click **Create User**.
6. Select the user -> Go to **Security credentials** tab.
7. Under **Access keys**, click **Create access key**.
8. Select **Application running outside AWS** and click **Next**.
9. Copy your **Access Key ID** and **Secret Access Key**.

### Step 4: Update `.env` File
Add the copied values to your `backend/.env` file:

```env
USE_AWS_S3=true
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAYOURACCESSKEYHERE
AWS_SECRET_ACCESS_KEY=yourSecretAccessKeyHere
AWS_S3_BUCKET=tenantflow-free-storage-2026
```

---

## 🔒 Security Best Practices
- **Never commit `.env` to Git repository.** (It is already added to `.gitignore`).
- Store a backup copy of your production secrets in a password manager.
- For production deployment (Render, AWS EC2, Vercel), add these variables directly into the deployment dashboard environment settings.
