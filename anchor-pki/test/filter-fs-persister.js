/**
 * https://github.com/Praqma/filter-fs-persister/blob/149306e7d31e550ff5b6565aa59f77d0afe651a2/filterFsPersister.js
 *
 * Customized version of the above. The above code was downloaded on 2023-08-12
 * and is licensed under the apache 2.0 license.
 *
 * Once this is working an upstream PR will be submitted.
 *
 *
 * Changes from usptream:
 *
 * - we want to be able to filter request and response headers
 */
const FSPersister = require('@pollyjs/persister-fs');

const { parse } = JSON;

module.exports = class FilteringFSPersister extends FSPersister {
    filterRecording(data) {
        if (this.options && this.options.filter) {
            if (process.env.DEBUG === 'true') {
                // eslint-disable-next-line no-console
                console.log('Filtering recording: ', this.options.filter);
            }
            data.log.entries.map((entry) => this.filterEntry(entry));
        }
        return data;
    }

    filterEntry(entry) {
        entry.request = this.filterRequest(entry.request);
        entry.response = this.filterResponse(entry.response);
        return entry;
    }

    filterRequest(request) {
        const filteredHeaders = [...this.options.filter.request.headers];

        if (filteredHeaders && this.options.filter.request.cookies) {
            filteredHeaders.push('set-cookie');
        }

        request.headers = this.filterHeaders(request.headers, filteredHeaders);
        request.cookies = this.filterCookies(request.cookies, this.options.filter.request.cookies);
        if (request.bodySize > 0) {
            if (request.body !== undefined) {
                request.body = this.filterBody(request.body, this.options.filter.request.body);
            }
            if (request.postData !== undefined) {
                request.postData = this.filterBody(request.postData, this.options.filter.request.body);
            }
        }
        return request;
    }

    /*
     * filter response headers and content. If there is a cookie filter going
     * on, the filter the `set-cookie` header.
     */
    filterResponse(response) {
        const filteredHeaders = [...this.options.filter.response.headers];

        if (filteredHeaders && this.options.filter.response.cookies) {
            filteredHeaders.push('set-cookie');
        }

        response.headers = this.filterHeaders(response.headers, filteredHeaders);
        response.cookies = this.filterCookies(response.cookies, this.options.filter.response.cookies);
        if (response.bodySize > 0 && (response.content !== undefined)) {
            response.content = this.filterBody(response.content, this.options.filter.response.body);
        }
        return response;
    }

    filterHeaders(headers, filter) {
        return headers.filter((header) => !filter.includes(header.name));
    }

    filterCookies(cookies, rejectedCookies) {
        if (cookies && (cookies.length > 0)) {
            return cookies.filter((cookie) => !rejectedCookies.includes(cookie.name));
        }
        return cookies;
    }

    filterBody(body, config) {
        if (body && body.text && body.mimeType.match(/application\/.*json/)) {
            try {
                const parsed = JSON.parse(body.text);
                const replacements = Object.entries(config);

                replacements.forEach(([key, value]) => {
                    if (parsed[key] !== undefined) {
                        parsed[key] = value;
                    }
                });

                body.text = JSON.stringify(parsed);
            }
            catch (e) {
                // eslint-disable-next-line no-console
                console.log(`Skipping parsing: ${body.text.substring(0, 20)} because ${e}`);
                // eslint-disable-next-line no-console
                console.log(e);
            }
        }
        return body;
    }

    static get id() {
        return 'filter-fs';
    }

    saveRecording(recordingId, data) {
        /*
          Pass the data through the base persister's stringify method so
          the output will be consistent with the rest of the persisters.
          */
        this.api.saveRecording(recordingId, parse(this.stringify(this.filterRecording(data))));
    }
};
