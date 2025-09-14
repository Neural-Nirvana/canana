# Canana - Simple Docker Deployment Guide

🎨 **Canana** is a visual prompting canvas application built with React, Fabric.js, and Google Gemini AI.

## 🚀 Quick Start

### Option 1: Using the Deployment Script (Recommended)

```bash
# Make script executable (if not already)
chmod +x deploy.sh

# Full deployment (build + run)
./deploy.sh

# Or use specific commands
./deploy.sh build    # Build the Docker image
./deploy.sh run      # Run the container
./deploy.sh logs     # View logs
./deploy.sh stop     # Stop the container
./deploy.sh restart  # Restart the container
./deploy.sh clean    # Remove container and image
```

### Option 2: Using Docker Compose

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop
docker-compose down
```

### Option 3: Manual Docker Commands

```bash
# Build the image
docker build -t canana .

# Run the container
docker run -d -p 3000:3000 --name canana-app canana

# View logs
docker logs canana-app

# Stop and remove
docker stop canana-app
docker rm canana-app
```

## 📋 Prerequisites

- Docker installed and running
- At least 1GB free disk space
- Port 3000 available (or modify port mapping)

## 🏗️ Architecture

### Simple Single-Stage Build
- **Node.js Alpine**: Builds and serves the React app
- **Serve package**: Lightweight static file server
- **Production optimized**: Built React app served directly

## 🔧 Configuration

### Environment Variables
```bash
# Set production environment
NODE_ENV=production
```

### Port Configuration
Default port is 3000. To use a different port:
```bash
# Using docker run
docker run -d -p 8080:3000 --name canana-app canana

# Using docker-compose (modify docker-compose.yml)
ports:
  - "8080:3000"
```

## 📊 Monitoring

### Container Status
```bash
# Check container health
docker ps

# View resource usage
docker stats canana-app
```

## 🔍 Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Use a different port
docker run -d -p 8080:3000 --name canana-app canana
```

**Build fails:**
```bash
# Clear Docker cache
docker system prune -f

# Rebuild without cache
docker build --no-cache -t canana .
```

**Container won't start:**
```bash
# Check logs
docker logs canana-app
```

### Logs and Debugging

```bash
# View application logs
docker logs canana-app

# Follow logs in real-time
docker logs -f canana-app

# Access container shell
docker exec -it canana-app sh
```

## 📈 Performance Tuning

### Resource Limits
```yaml
# In docker-compose.yml
services:
  canana:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## 📚 File Structure

```
artist-workspace/
├── Dockerfile              # ✅ Simple build configuration
├── docker-compose.yml      # ✅ Docker Compose configuration
├── .dockerignore          # ✅ Docker ignore file
├── deploy.sh              # ✅ Deployment script
└── DOCKER_README.md       # ✅ This file
```

## 🎯 Production Checklist

- [ ] Test build locally
- [ ] Configure port mapping
- [ ] Test performance
- [ ] Set up monitoring
- [ ] Configure firewall rules

## 📞 Support

For issues with Docker deployment:
1. Check the troubleshooting section above
2. Review Docker logs
3. Ensure all prerequisites are met
4. Check network connectivity

---

🎨 **Happy deploying with Canana!**