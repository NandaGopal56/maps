'use-strict';

const pathsContainer = document.querySelector('.card-container');
const adressInputForm = document.getElementById('adressInputForm');
const fromAddressElement = document.getElementById('fromAddress');
const toAddressElement = document.getElementById('toAddress');
const GEOCODE_API_KEY1 = '';
const GEOCODE_API_KEY2 = '';

// Appplication Architecture
class App {
    #map;
    #mapZomLevel = 13;
    #routes;
    #coordinates;
    #circleIcon;
    #prevMarker = false;

    constructor() {
        this.fromAddressData = this.toAddressData = []
        //get user's position
        this._getPosition()
        pathsContainer.addEventListener('mouseover', this._onHoverMovePointerToDirectionMarker.bind(this));
        pathsContainer.addEventListener('click', this._onClickMovePointerToDirectionMarker.bind(this));
        adressInputForm.addEventListener('submit', this._handleAddressFormSubmission.bind(this));
    }

    async _makeApiCall(apiUrl) {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            alert('Error during API call:', error);
        }
    }

    _extractCoordinates(apiResponse) {
        if (apiResponse.length > 0) {
            const highestImportanceItem = apiResponse.reduce((prev, current) => {
                return prev.importance > current.importance ? prev : current;
            });

            const lat = highestImportanceItem.lat;
            const lon = highestImportanceItem.lon;
            const displayName = highestImportanceItem.display_name;

            return { 'lat': lat, 'lon': lon, 'displayName': displayName }
        } else {
            alert('No address found')
        }
    }


    async _handleAddressFormSubmission(event) {
        event.preventDefault();

        // Collect form data
        const fromAddress = document.getElementById('fromAddress').value;
        const toAddress = document.getElementById('toAddress').value;

        // Construct the API URL
        const fromAPIUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(fromAddress)}&api_key=${GEOCODE_API_KEY1}`;
        const toAPIUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(toAddress)}&api_key=${GEOCODE_API_KEY2}`;

        try {
            // Make asynchronous API calls simultaneously
            const apiResponse1Promise = await this._makeApiCall(fromAPIUrl);

            // Introduce a 1-second time gap before the second API call
            console.log('Waiting for 1 second...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const apiResponse2Promise = await this._makeApiCall(toAPIUrl);

            // Wait for both API calls to complete
            const [apiResponse1, apiResponse2] = await Promise.all([apiResponse1Promise, apiResponse2Promise]);

            this.fromAddressData = this._extractCoordinates(apiResponse1);
            this.toAddressData = this._extractCoordinates(apiResponse2);
            console.log(this.fromAddressData, this.toAddressData);

            this._loadMpa(this.fromAddressData.lat, this.fromAddressData.lon, this.toAddressData.lat, this.toAddressData.lon)

        } catch (error) {
            console.error('An error occurred:', error);
        }

    }

    _getPosition() {
        if (navigator.geolocation) {
            // navigator.geolocation.getCurrentPosition(
            //     this._loadMpa.bind(this), this._onLocationPermissionDenied
            // )
        }
    }

    _loadMpa(fromLatitude, fromLongitude, toLatitude, toLongitude) {

        this.#map = L.map('map').setView([fromLatitude, fromLongitude], this.#mapZomLevel);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        let control = L.Routing.control({
            waypoints: [
                L.latLng(fromLatitude, fromLongitude),
                L.latLng(toLatitude, toLongitude)
            ],
            routeWhileDragging: true,
            useZoomParameter: true,
            showAlternatives: true,
            // show: false
        }).addTo(this.#map);

        let html = '';

        // Listen for events when the route is changed
        control.on('routesfound', function (e) {
            console.log('routes found', e);

            this.#coordinates = e.routes[0].coordinates;
            this.#routes = e.routes[0].instructions;


            this.#routes.forEach(function (route, index) {

                html += `
                        <div class="card" data-id="${route.index}">
                            <span class="direction-icon">${route.type}></span>
                            <span class="instruction-text">${route.text}</span>
                            <span class="distance">${(route.distance / 1000).toFixed(2)} KM</span>
                        </div>
                        `
            });

            pathsContainer.innerHTML = html

            fromAddressElement.value = this.fromAddressData.displayName;
            toAddressElement.value = this.toAddressData.displayName;
        }.bind(this));



    }

    _onLocationPermissionDenied(error) {
        const userMessage = `${error.message}`
        alert(userMessage);
    }

    _onHoverMovePointerToDirectionMarker(event) {
        const pathElement = event.target.closest('.card')

        if (!pathElement) return;

        const coords = this.#coordinates[pathElement.dataset.id];

        if (this.#prevMarker == true) {
            this.#map.removeLayer(this.#circleIcon);
        };

        this.#circleIcon = L.circleMarker([coords.lat, coords.lng], {
            radius: 4,
            color: 'blue',
            fillOpacity: 0.1
        }).addTo(this.#map);

        this.#prevMarker = true;
    }

    _onClickMovePointerToDirectionMarker(event) {
        const pathElement = event.target.closest('.card')

        if (!pathElement) return;

        const coords = this.#coordinates[pathElement.dataset.id];

        this.#map.setView(coords, this.#mapZomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
    }
}


const app = new App();