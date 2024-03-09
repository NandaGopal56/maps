'use-strict';

const pathsContainer = document.querySelector('.card-container');
const adressInputForm = document.getElementById('adressInputForm');
const fromAddressElement = document.getElementById('fromAddress');
const toAddressElement = document.getElementById('toAddress');
const pathOptionsContainer = document.querySelector('.paths-container');
const GEOCODE_API_KEY1 = '65cf9fd2031b9021127422vsc7df31d';
const GEOCODE_API_KEY2 = '65cfa405e758d099762575yje19a15d';

// Appplication Architecture
class App {
    #map = L.map('map');
    #mapZomLevel = 13;
    #routes;
    #coordinates;
    #defaultPathOptionIndex = 0;
    #circleIcon;
    #prevMarker = false;

    constructor() {
        this.fromAddressData = this.toAddressData = {}
        this.defaultUserCoordinates = {};

        this.routeControl;

        //initilaize the map with saome random coordinates
        this._viewMapAtCoordinate([20.29, 88.82]);

        //test dummy path
        // this._loadMpa(48.8587831, 2.3469504, 48.85878, 52.35451)

        //get user's position
        this._getPosition()


        pathsContainer.addEventListener('mouseover', this._onHoverMovePointerToDirectionMarker.bind(this));
        pathsContainer.addEventListener('click', this._onClickMovePointerToDirectionMarker.bind(this));
        pathOptionsContainer.addEventListener('click', this._onClickChangeRouteOpion.bind(this))
        adressInputForm.addEventListener('submit', this._handleAddressFormSubmission.bind(this));
    }

    _viewMapAtCoordinate(coords) {
        this.#map.setView(coords, this.#mapZomLevel);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
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

        let apiResponse1Promise;

        try {
            if (Object.keys(this.defaultUserCoordinates).length == 0 || (fromAddress !== this.defaultUserCoordinates.displayName)) {
                apiResponse1Promise = await this._makeApiCall(fromAPIUrl);

                //waiting for 1 secorndbefore making the api call 2nd time to avoid rate limit of 1 second
                await new Promise(resolve => setTimeout(resolve, 1000));

            } else {
                apiResponse1Promise = Promise.resolve(null);
            }

            const apiResponse2Promise = await this._makeApiCall(toAPIUrl);

            // Wait for both API calls to complete
            const [apiResponse1, apiResponse2] = await Promise.all([apiResponse1Promise, apiResponse2Promise]);

            if (!apiResponse1) {
                this.fromAddressData = this.defaultUserCoordinates
            }
            else {
                this.fromAddressData = this._extractCoordinates(apiResponse1);
            }

            this.toAddressData = this._extractCoordinates(apiResponse2);

            this._loadMpa(this.fromAddressData.lat, this.fromAddressData.lon, this.toAddressData.lat, this.toAddressData.lon)

        } catch (error) {
            console.error('An error occurred:', error);
        }

    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadUserLocationIntoForm.bind(this), this._onLocationPermissionDenied
            )
        }
    }

    async _loadUserLocationIntoForm(coordinates) {
        const lat = coordinates.coords.latitude
        const lon = coordinates.coords.longitude

        this._viewMapAtCoordinate([lat, lon])

        const apiURL = `https://geocode.maps.co/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&api_key=${encodeURIComponent(GEOCODE_API_KEY2)}`;

        try {
            // Make asynchronous API calls simultaneously
            const res = await this._makeApiCall(apiURL);

            this.defaultUserCoordinates = { 'lat': lat, 'lon': lon, 'displayName': res.display_name };

            fromAddressElement.value = res.display_name

        } catch (error) {
            console.error('An error occurred:', error);
        }
    }

    _loadMpa(fromLatitude, fromLongitude, toLatitude, toLongitude) {

        // in case there is already a path rendered , then first remove the previous path before rendering the new one
        if (this.routeControl) {
            this.#map.removeControl(this.routeControl)
        }

        this.routeControl = L.Routing.control({
            waypoints: [
                L.latLng(fromLatitude, fromLongitude),
                L.latLng(toLatitude, toLongitude)
            ],
            routeWhileDragging: true,
            useZoomParameter: true,
            showAlternatives: true,
            show: false
        }).addTo(this.#map);

        // Listen for events when the route is changed
        this.routeControl.on('routesfound', this._renderPathInstructionCard.bind(this));
    }

    _renderPathInstructionCard(e) {
        console.log('routes found', e);

        this.#coordinates = e.routes;
        this.#routes = e.routes;

        let html = '';

        this.#routes[this.#defaultPathOptionIndex].instructions.forEach(function (route, index) {

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

        let pathsHtml = '';
        let PathsAvaialble = e.routes

        PathsAvaialble.forEach(function (path, index) {
            pathsHtml += `<div class="path-card card" data-id="${path.routesIndex}"> 
                                <span> ${path.name}, ${(path.summary.totalDistance / 1000).toFixed(2)} KM, ${(path.summary.totalTime / 60).toFixed(2)} mins </span> 
                            </div>`
        })

        pathOptionsContainer.innerHTML = pathsHtml
    }

    _onLocationPermissionDenied(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert("User denied the request for Geolocation.");
                break;
            case error.POSITION_UNAVAILABLE:
                alert("Location information is unavailable.");
                break;
            case error.TIMEOUT:
                alert("The request to get user location timed out.");
                break;
            default:
                alert("An unknown error occurred.");
                break;
        }
    }

    _onHoverMovePointerToDirectionMarker(event) {
        const pathElement = event.target.closest('.card')

        if (!pathElement) return;
        const coords = this.#coordinates[this.#defaultPathOptionIndex].coordinates[pathElement.dataset.id];

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

        const coords = this.#coordinates[this.#defaultPathOptionIndex].coordinates[pathElement.dataset.id];

        this.#map.setView(coords, this.#mapZomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
    }

    _onClickChangeRouteOpion(event) {
        const pathOptionElement = event.target.closest('.path-card')
        if (!pathOptionElement) return;

        this.#defaultPathOptionIndex = pathOptionElement.dataset.id
        let html = '';
        this.#routes[this.#defaultPathOptionIndex].instructions.forEach(function (route, index) {

            html += `
                    <div class="card" data-id="${route.index}">
                        <span class="direction-icon">${route.type}></span>
                        <span class="instruction-text">${route.text}</span>
                        <span class="distance">${(route.distance / 1000).toFixed(2)} KM</span>
                    </div>
                    `
        });

        pathsContainer.innerHTML = html
    }
}


const app = new App();