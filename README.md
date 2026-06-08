# Historical Location Explorer

A web-based geolocation system that helps users discover historical and cultural information about their current surroundings.

The platform combines GPS-based location tracking, interactive maps, historical databases, and public APIs to provide contextual information about nearby landmarks, historical events, cultural heritage sites, and notable figures associated with a geographic location.

---

## 🚀 Key Features

* **Real-Time Geolocation:** Detects the user's current position using browser-based GPS services.
* **Interactive Map Visualization:** Displays user location and nearby historical points of interest on an interactive map.
* **Historical Information Retrieval:** Fetches and presents historical and cultural information related to geographic locations.
* **Public API Integration:** Integrates data from sources such as Wikipedia, Wikidata, and OpenStreetMap.
* **Spatial Database Support:** Uses geographic queries to identify and rank nearby historical locations.
* **Responsive User Interface:** Designed for both desktop and mobile devices.

---

## 🛠️ Tech Stack

### Frontend

* React.js
* HTML5
* CSS3
* JavaScript
* Leaflet.js / Mapbox GL JS

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL
* PostGIS

### External Data Sources

* Wikipedia API
* Wikidata API
* OpenStreetMap

---

## 📊 System Architecture

User Location
↓
Geolocation API
↓
Interactive Map
↓
Backend API
↓
PostGIS Database + External APIs
↓
Historical Information Processing
↓
Information Display

---

## 🌍 Core Functionalities

### 1. User Geolocation

The system obtains the user's current coordinates using the browser's Geolocation API.

### 2. Interactive Map Display

An interactive map visualizes the user's location and nearby historical sites.

### 3. Historical Data Retrieval

Historical information is collected from public data sources and local datasets.

### 4. Spatial Search

Geographic queries identify historical locations near the user's current position.

### 5. Information Presentation

The system presents historical descriptions, cultural information, and related points of interest in a user-friendly format.

---

## 🗺️ Database Design

The project uses PostgreSQL with the PostGIS extension to support spatial operations.

Main stored data includes:

* Historical landmarks
* Geographic coordinates
* Cultural locations
* Historical descriptions
* Data sources and references

Example spatial operations:

* Nearest historical locations
* Distance calculations
* Radius-based searches
* Geographic filtering

---

## 📡 API Endpoints

### Get Nearby Historical Locations

```http
GET /api/nearby
```

Returns historical locations near the user's current coordinates.

### Get Location Details

```http
GET /api/place/:id
```

Returns detailed information about a selected historical location.

---

## 🎯 Use Cases

* Cultural tourism
* Historical education
* Location-based learning
* Geographic information systems (GIS)
* Digital heritage preservation
* Smart tourism applications

---

## 📈 Challenges & Solutions

### Challenge 1: Integrating Multiple Data Sources

**Solution:** Combined local datasets with public APIs such as Wikipedia and OpenStreetMap to provide richer historical information.

### Challenge 2: Efficient Geographic Queries

**Solution:** Used PostgreSQL with PostGIS to perform optimized spatial searches and distance calculations.

### Challenge 3: Real-Time User Experience

**Solution:** Implemented asynchronous API requests and interactive map rendering to provide fast responses.

---

## 🔮 Future Improvements

* Progressive Web App (PWA)
* Mobile application support
* Crowdsourced historical contributions
* AI-powered historical recommendations
* Augmented Reality (AR) historical visualization
* Personalized historical tours

---

## 📚 Educational Objectives

This project was developed as an undergraduate Software Engineering capstone project to explore:

* Full-Stack Web Development
* Geographic Information Systems (GIS)
* Spatial Databases
* API Integration
* Software Architecture Design
* Location-Based Services (LBS)

---

## Author

Developed as a Software Engineering undergraduate project focused on location-based historical information systems and modern web technologies.
