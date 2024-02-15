'use-strict';

const pathsContainer = document.querySelector('.card-container');


// Appplication Architecture
class App {
    #map;
    #mapZomLevel = 13;
    #routes;
    #coordinates;
    #circleIcon;
    #prevMarker = false;

    constructor() {
        //get user's position
        this._getPosition()
        pathsContainer.addEventListener('mouseover', this._onHoverMovePointerToDirectionMarker.bind(this))
        pathsContainer.addEventListener('click', this._onClickMovePointerToDirectionMarker.bind(this))
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMpa.bind(this), this._onLocationPermissionDenied
            )
        }
    }

    _loadMpa(position) {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        this.#map = L.map('map').setView([latitude, longitude], this.#mapZomLevel);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        let control = L.Routing.control({
            waypoints: [
                L.latLng(latitude, longitude),
                L.latLng(latitude + .1, longitude + .1)
            ],
            routeWhileDragging: true,
            useZoomParameter: true,
            showAlternatives: true,
            // show: false
        }).addTo(this.#map);

        let html = '';

        // Listen for events when the route is changed
        control.on('routesfound', function (e) {
            this.#coordinates = e.routes[1].coordinates;
            this.#routes = e.routes[1].instructions;

            console.log(e.routes[1], this.#routes, this.#coordinates);

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