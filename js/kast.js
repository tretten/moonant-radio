/*!
 * Kast - Extraordinary SHOUTcast HTML5 Radio Player for jQuery - Material Design
 * Copyrights: 2015-2016 Manar Kamel (manarkamel.github.io)
 */

(function ($, window, document, undefined) {

    // Plugin defaults
    // ======================================================== //
    var defaults = {
        host: "s25.myradiostream.com",
        port: 12650,
        version: 1,
        sid: 1, // Server stream ID (If you have multiple SHOUTcast V2 stations) @integer
        statsPath: 'stats', // Path to stats @string
        playedPath: 'played', // Path to played @string
        ui: 'transparent', // Transparent or colored and kast-nowplaying @string
        theme: 'light', // Dark, light or dynamic: based on the current album artwork @string
        colors: {
            primary: 'cyan', // Material Design primary color - Material name @string
            accent: 'yellow' // Material Design accent color - Material name @string
        }, // set fixed colors or set 'dynamic': based on the current album artwork @object
        startTemplate: 'maximized', // Start minimized or maximized on load @string
        position: 'left', // Player position (Bottom right or left) @string
        container: 'body', // Player container element, class or ID. everything other than 'body' isn't fixed @string
        autoPlay: false, // Autoplay radio on load @boolean
        autoUpdate: true, // Autoupdate (Boolean or string: 'all') (current info / Played info / album artwork) @boolean @string
        artwork: true, // Pull album artwork (or artist artwork as a fallback) from Spotify API or set a custom one @boolean @array
        statusBar: true, // Show status bar at the top @boolean
        minimizeMaximize: false, // Show minimize/maximize button in status bar @boolean
        muteUnmute: false, // Show mute/unmute button in status bar
        startMuted: false, // Start audio muted on load @boolean
        serverInfo: false, // Show serverInfo in status bar or set custom info @string @array @false
        played: false, // Show played tracks/artists @boolean
        currentTrack: true, // Show current track name, or set a custom track name @boolean @string
        currentArtist: true, // Show the current artist name, or set a custom artist name @boolean @string
        playedTracks: false, // Show the played track names @boolean
        playedArtists: false, // Show the played artist names @boolean
        offlineCheck: true, // On offline, show offline status @boolean
        language: {
            offlineText: 'Temporarily Offline', // On offline: status bar text @string
            playedText: 'Played', // Played title (player bottom) @string
            unknownTrackText: 'Копмозиция', // Set unknown track text when error
            unknownArtistText: 'Исполнитель' // Set unknown artist text when error
        }, // Set text (Multi language support) @object
        mobileCare: true, // low (aka true), medium, high, very high, ultra @boolean @array
        irrelevantWords: ['feat.', 'ft.', 'Feat.', 'Ft.'], // irrelvant words in SHOUTcast full song title @false or @array
        overHTTPS: false, // Run SHOUTcast stream over an HTTPS proxy for HTTPS websites (experimental) (false) @boolean
        onReady: function () {}, // Kast event
        onAudioLoad: function () {}, // Kast event
        onMobile: function () {}, // Kast event
        onPlay: function () {}, // Kast event
        onPause: function () {}, // Kast event
        onMinimize: function () {}, // Kast event
        onMaximize: function () {}, // Kast event
        onMute: function () {}, // Kast event
        onUnmute: function () {}, // Kast event
        onUpdate: function () {}, // Kast event
        onUpdateAll: function () {}, // Kast event
        onOffline: function () {}, // Kast event
        onOnline: function () {}, // Kast event
        onCurrentArtwork: function () {}, // Kast event
        onPlayedArtworks: function () {}, // Kast event
        onCurrentInfo: function () {}, // Kast event
        onPlayedInfo: function () {}, // Kast event
        onDynamicColors: function () {}, // Kast event
        onDynamicColorsContrast: function () {}, // Kast event
        onDynamicTheme: function () {} // Kast event
    };

    // Plugin constructor
    // ======================================================== //
    function Plugin(element, options) {

        this.opt = $.extend({}, defaults, options);

        // -- Validation
        var HTML5Audio = function () {
            var a = new Audio();
            return !!((a.canPlayType) && (a.canPlayType('audio/mpeg;').replace(/^no$/, '') || a.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, '') || a.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, '') || a.canPlayType('audio/aac;').replace(/^no$/, '')));
        }
        if (!this.opt.host || !HTML5Audio || !window.DOMParser) {
            $.data(document.body, 'plugin_kast', null)

            throw Error("Kast couldn't load")
        }

        // Extended extra objects
        if (options.language) {
            this.opt.language = $.extend({}, defaults.language, options.language);
        }
        if (typeof options.colors === 'object') {
            this.opt.colors = $.extend({}, defaults.colors, options.colors);
        }

        // -- Options correction (idiot-proof)
        if (this.opt.startTemplate === 'minimized' && (!this.opt.statusBar || !this.opt.minimizeMaximize)) {
            this.opt.played = false;
        }


        var iot = this.opt;

        // -- Host
        this.host = 'http://' + iot.host + ':' + iot.port + '/';

        // -- Protocol
        var protocol = (window.location.protocol === 'https:') ? 'https:' : 'http:';

        this.hostCORS = protocol + '//crossorigin.me/' + this.host; // ** Primary Proxy
        this.hostCORS2 = 'https://cors-anywhere.herokuapp.com/' + this.host; // ** Alternative Proxy (Always Secure)

        //this.hostCORS = protocol + '//kastdemo-us.herokuapp.com/' + this.host;
        //this.hostCORS2 = protocol + '//kastdemo-eu.herokuapp.com/' + this.host;

        if (iot.overHTTPS && protocol === 'https:') {
            this.host = this.hostCORS;
        }


        // -- Audio
        var sc2sid = iot.sid,
            audioSrc = (sc2sid > 1) ? this.host + 'stream' + sc2sid : this.host + ';';

        this.audio = document.createElement('audio');
        this.audio.src = audioSrc + '?_=' + Math.random();
        this.audio.load();

        // -- Event: on audio load
        iot.onAudioLoad(this.audio)

        // -- SHOUTcast Version
        if (iot.version === 1) {
            iot.played = false
        }

        // -- Mobile Care
        this.mobile = false;
        this.mobileMedium = false;
        //this.mobileHigh = false;
        //this.mobileVeryHigh = false;
        this.mobileUltra = false;
        var mC = iot.mobileCare,
            mCMW = mC[1] || '599px';


        if (mC && window.matchMedia && window.matchMedia('(max-width: ' + mCMW + ')').matches) {
            this.mobile = true;

            iot.autoPlay = false;
            iot.startTemplate = 'minimized';
            iot.offlineCheck = false;

            // -- Inside plugin
            // Checker Interval 12s

            if (mC[0] === 'medium' || mC[0] === 'high' || mC[0] === 'very high' || mC[0] === 'ultra') {
                this.mobileMedium = true;
                if (iot.autoUpdate === 'all') {
                    iot.autoUpdate = true
                }
                if (iot.theme === 'dynamic') {
                    iot.theme = 'light'
                }
                if (iot.colors === 'dynamic') {
                    iot.colors = false;
                }
                // -- Inside plugin
                // Medium quality artwork images
                // Checker Interval 16s
            }
            if (mC[0] === 'high' || mC[0] === 'very high' || mC[0] === 'ultra') {
                iot.artwork = iot.played = false;
            }
            if (mC[0] === 'very high' || mC[0] === 'ultra') {
                iot.autoUpdate = iot.minimizeMaximize = false;
            }
            if (mC[0] === 'ultra') {
                this.mobileUltra = true;
                iot.statusBar = iot.serverInfo = iot.currentArtist = iot.currentTrack = false;
            }

            iot.onMobile() // Event
        }


        // -- Initialize
        this.init();


    }

    // Plugin dependencies, helpers and feature detection
    // ======================================================== //
    /*
     * Color Thief v2.0 - Customized for Kast needs only
     * by Lokesh Dhakar - http://www.lokeshdhakar.com
     *
     * Thanks
     * ------
     * Nick Rabinowitz - For creating quantize.js.
     * John Schulz - For clean up and optimization. @JFSIII
     * Nathan Spady - For adding drag and drop support to the demo page.
     *
     * License
     * -------
     * Copyright 2011, 2015 Lokesh Dhakar
     * Released under the MIT license
     * https://raw.githubusercontent.com/lokesh/color-thief/master/LICENSE
     *
     * Note: Lokesh's comments are removed here
     */

    var CanvasImage = function (image) {
            this.canvas = document.createElement('canvas');
            this.context = this.canvas.getContext('2d');

            document.body.appendChild(this.canvas);

            this.width = this.canvas.width = image.width;
            this.height = this.canvas.height = image.height;

            this.context.drawImage(image, 0, 0, this.width, this.height);
        },
        ColorThief = function () {};

    CanvasImage.prototype = {
        clear: function () {
            this.context.clearRect(0, 0, this.width, this.height);
        },
        update: function (imageData) {
            this.context.putImageData(imageData, 0, 0);
        },
        getPixelCount: function () {
            return this.width * this.height;
        },
        getImageData: function () {
            return this.context.getImageData(0, 0, this.width, this.height);
        },
        removeCanvas: function () {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
    ColorThief.prototype.getPalette = function (sourceImage, colorCount) {

        // Create custom CanvasImage object
        var image = new CanvasImage(sourceImage);
        var imageData = image.getImageData();
        var pixels = imageData.data;
        var pixelCount = image.getPixelCount();

        // Store the RGB values in an array format suitable for quantize function
        var pixelArray = [];
        for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + 10) { // ** 10 is quality
            offset = i * 4;
            r = pixels[offset + 0];
            g = pixels[offset + 1];
            b = pixels[offset + 2];
            a = pixels[offset + 3];
            // If pixel is mostly opaque and not white
            if (a >= 125) {
                if (!(r > 250 && g > 250 && b > 250)) {
                    pixelArray.push([r, g, b]);
                }
            }
        }

        // Send array to quantize function which clusters values
        // using median cut algorithm
        var cmap = MMCQ.quantize(pixelArray, colorCount);
        var palette = cmap ? cmap.palette() : null;

        // Clean up
        image.removeCanvas();

        return palette;
    };

    if (!pv) {
        var pv = {
            map: function (array, f) {
                var o = {};
                return f ? array.map(function (d, i) {
                    o.index = i;
                    return f.call(o, d);
                }) : array.slice();
            },
            naturalOrder: function (a, b) {
                return (a < b) ? -1 : ((a > b) ? 1 : 0);
            },
            sum: function (array, f) {
                var o = {};
                return array.reduce(f ? function (p, d, i) {
                    o.index = i;
                    return p + f.call(o, d);
                } : function (p, d) {
                    return p + d;
                }, 0);
            },
            max: function (array, f) {
                return Math.max.apply(null, f ? pv.map(array, f) : array);
            }
        };
    }
    var MMCQ = (function () {
        // private constants
        var sigbits = 5,
            rshift = 8 - sigbits,
            maxIterations = 1000,
            fractByPopulations = 0.75;

        // get reduced-space color index for a pixel
        function getColorIndex(r, g, b) {
            return (r << (2 * sigbits)) + (g << sigbits) + b;
        }

        // Simple priority queue
        function PQueue(comparator) {
            var contents = [],
                sorted = false;

            function sort() {
                contents.sort(comparator);
                sorted = true;
            }

            return {
                push: function (o) {
                    contents.push(o);
                    sorted = false;
                },
                peek: function (index) {
                    if (!sorted) sort();
                    if (index === undefined) index = contents.length - 1;
                    return contents[index];
                },
                pop: function () {
                    if (!sorted) sort();
                    return contents.pop();
                },
                size: function () {
                    return contents.length;
                },
                map: function (f) {
                    return contents.map(f);
                },
                debug: function () {
                    if (!sorted) sort();
                    return contents;
                }
            };
        }

        // 3d color space box
        function VBox(r1, r2, g1, g2, b1, b2, histo) {
            var vbox = this;
            vbox.r1 = r1;
            vbox.r2 = r2;
            vbox.g1 = g1;
            vbox.g2 = g2;
            vbox.b1 = b1;
            vbox.b2 = b2;
            vbox.histo = histo;
        }
        VBox.prototype = {
            volume: function (force) {
                var vbox = this;
                if (!vbox._volume || force) {
                    vbox._volume = ((vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1));
                }
                return vbox._volume;
            },
            count: function (force) {
                var vbox = this,
                    histo = vbox.histo;
                if (!vbox._count_set || force) {
                    var npix = 0,
                        i, j, k;
                    for (i = vbox.r1; i <= vbox.r2; i++) {
                        for (j = vbox.g1; j <= vbox.g2; j++) {
                            for (k = vbox.b1; k <= vbox.b2; k++) {
                                index = getColorIndex(i, j, k);
                                npix += (histo[index] || 0);
                            }
                        }
                    }
                    vbox._count = npix;
                    vbox._count_set = true;
                }
                return vbox._count;
            },
            copy: function () {
                var vbox = this;
                return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
            },
            avg: function (force) {
                var vbox = this,
                    histo = vbox.histo;
                if (!vbox._avg || force) {
                    var ntot = 0,
                        mult = 1 << (8 - sigbits),
                        rsum = 0,
                        gsum = 0,
                        bsum = 0,
                        hval,
                        i, j, k, histoindex;
                    for (i = vbox.r1; i <= vbox.r2; i++) {
                        for (j = vbox.g1; j <= vbox.g2; j++) {
                            for (k = vbox.b1; k <= vbox.b2; k++) {
                                histoindex = getColorIndex(i, j, k);
                                hval = histo[histoindex] || 0;
                                ntot += hval;
                                rsum += (hval * (i + 0.5) * mult);
                                gsum += (hval * (j + 0.5) * mult);
                                bsum += (hval * (k + 0.5) * mult);
                            }
                        }
                    }
                    if (ntot) {
                        vbox._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
                    } else {
                        //                    console.log('empty box');
                        vbox._avg = [
                        ~~(mult * (vbox.r1 + vbox.r2 + 1) / 2),
                        ~~(mult * (vbox.g1 + vbox.g2 + 1) / 2),
                        ~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)
                    ];
                    }
                }
                return vbox._avg;
            },
            contains: function (pixel) {
                var vbox = this,
                    rval = pixel[0] >> rshift;
                gval = pixel[1] >> rshift;
                bval = pixel[2] >> rshift;
                return (rval >= vbox.r1 && rval <= vbox.r2 &&
                    gval >= vbox.g1 && gval <= vbox.g2 &&
                    bval >= vbox.b1 && bval <= vbox.b2);
            }
        };

        // Color map
        function CMap() {
            this.vboxes = new PQueue(function (a, b) {
                return pv.naturalOrder(
                    a.vbox.count() * a.vbox.volume(),
                    b.vbox.count() * b.vbox.volume()
                );
            });
        }
        CMap.prototype = {
            push: function (vbox) {
                this.vboxes.push({
                    vbox: vbox,
                    color: vbox.avg()
                });
            },
            palette: function () {
                return this.vboxes.map(function (vb) {
                    return vb.color;
                });
            },
            size: function () {
                return this.vboxes.size();
            },
            map: function (color) {
                var vboxes = this.vboxes;
                for (var i = 0; i < vboxes.size(); i++) {
                    if (vboxes.peek(i).vbox.contains(color)) {
                        return vboxes.peek(i).color;
                    }
                }
                return this.nearest(color);
            },
            nearest: function (color) {
                var vboxes = this.vboxes,
                    d1, d2, pColor;
                for (var i = 0; i < vboxes.size(); i++) {
                    d2 = Math.sqrt(
                        Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
                        Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
                        Math.pow(color[2] - vboxes.peek(i).color[2], 2)
                    );
                    if (d2 < d1 || d1 === undefined) {
                        d1 = d2;
                        pColor = vboxes.peek(i).color;
                    }
                }
                return pColor;
            },
            forcebw: function () {
                // XXX: won't  work yet
                var vboxes = this.vboxes;
                vboxes.sort(function (a, b) {
                    return pv.naturalOrder(pv.sum(a.color), pv.sum(b.color));
                });

                // force darkest color to black if everything < 5
                var lowest = vboxes[0].color;
                if (lowest[0] < 5 && lowest[1] < 5 && lowest[2] < 5)
                    vboxes[0].color = [0, 0, 0];

                // force lightest color to white if everything > 251
                var idx = vboxes.length - 1,
                    highest = vboxes[idx].color;
                if (highest[0] > 251 && highest[1] > 251 && highest[2] > 251)
                    vboxes[idx].color = [255, 255, 255];
            }
        };

        // histo (1-d array, giving the number of pixels in
        // each quantized region of color space), or null on error
        function getHisto(pixels) {
            var histosize = 1 << (3 * sigbits),
                histo = new Array(histosize),
                index, rval, gval, bval;
            pixels.forEach(function (pixel) {
                rval = pixel[0] >> rshift;
                gval = pixel[1] >> rshift;
                bval = pixel[2] >> rshift;
                index = getColorIndex(rval, gval, bval);
                histo[index] = (histo[index] || 0) + 1;
            });
            return histo;
        }

        function vboxFromPixels(pixels, histo) {
            var rmin = 1000000,
                rmax = 0,
                gmin = 1000000,
                gmax = 0,
                bmin = 1000000,
                bmax = 0,
                rval, gval, bval;
            // find min/max
            pixels.forEach(function (pixel) {
                rval = pixel[0] >> rshift;
                gval = pixel[1] >> rshift;
                bval = pixel[2] >> rshift;
                if (rval < rmin) rmin = rval;
                else if (rval > rmax) rmax = rval;
                if (gval < gmin) gmin = gval;
                else if (gval > gmax) gmax = gval;
                if (bval < bmin) bmin = bval;
                else if (bval > bmax) bmax = bval;
            });
            return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
        }

        function medianCutApply(histo, vbox) {
            if (!vbox.count()) return;

            var rw = vbox.r2 - vbox.r1 + 1,
                gw = vbox.g2 - vbox.g1 + 1,
                bw = vbox.b2 - vbox.b1 + 1,
                maxw = pv.max([rw, gw, bw]);
            // only one pixel, no split
            if (vbox.count() == 1) {
                return [vbox.copy()];
            }
            /* Find the partial sum arrays along the selected axis. */
            var total = 0,
                partialsum = [],
                lookaheadsum = [],
                i, j, k, sum, index;
            if (maxw == rw) {
                for (i = vbox.r1; i <= vbox.r2; i++) {
                    sum = 0;
                    for (j = vbox.g1; j <= vbox.g2; j++) {
                        for (k = vbox.b1; k <= vbox.b2; k++) {
                            index = getColorIndex(i, j, k);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            } else if (maxw == gw) {
                for (i = vbox.g1; i <= vbox.g2; i++) {
                    sum = 0;
                    for (j = vbox.r1; j <= vbox.r2; j++) {
                        for (k = vbox.b1; k <= vbox.b2; k++) {
                            index = getColorIndex(j, i, k);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            } else { /* maxw == bw */
                for (i = vbox.b1; i <= vbox.b2; i++) {
                    sum = 0;
                    for (j = vbox.r1; j <= vbox.r2; j++) {
                        for (k = vbox.g1; k <= vbox.g2; k++) {
                            index = getColorIndex(j, k, i);
                            sum += (histo[index] || 0);
                        }
                    }
                    total += sum;
                    partialsum[i] = total;
                }
            }
            partialsum.forEach(function (d, i) {
                lookaheadsum[i] = total - d;
            });

            function doCut(color) {
                var dim1 = color + '1',
                    dim2 = color + '2',
                    left, right, vbox1, vbox2, d2, count2 = 0;
                for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
                    if (partialsum[i] > total / 2) {
                        vbox1 = vbox.copy();
                        vbox2 = vbox.copy();
                        left = i - vbox[dim1];
                        right = vbox[dim2] - i;
                        if (left <= right)
                            d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
                        else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                        // avoid 0-count boxes
                        while (!partialsum[d2]) d2++;
                        count2 = lookaheadsum[d2];
                        while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
                        // set dimensions
                        vbox1[dim2] = d2;
                        vbox2[dim1] = vbox1[dim2] + 1;
                        //                    console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
                        return [vbox1, vbox2];
                    }
                }

            }
            // determine the cut planes
            return maxw == rw ? doCut('r') :
                maxw == gw ? doCut('g') :
                doCut('b');
        }

        function quantize(pixels, maxcolors) {
            // short-circuit
            if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
                //            console.log('wrong number of maxcolors');
                return false;
            }

            // XXX: check color content and convert to grayscale if insufficient

            var histo = getHisto(pixels),
                histosize = 1 << (3 * sigbits);

            // check that we aren't below maxcolors already
            var nColors = 0;
            histo.forEach(function () {
                nColors++;
            });
            if (nColors <= maxcolors) {
                // XXX: generate the new colors from the histo and return
            }

            // get the beginning vbox from the colors
            var vbox = vboxFromPixels(pixels, histo),
                pq = new PQueue(function (a, b) {
                    return pv.naturalOrder(a.count(), b.count());
                });
            pq.push(vbox);

            // inner function to do the iteration
            function iter(lh, target) {
                var ncolors = 1,
                    niters = 0,
                    vbox;
                while (niters < maxIterations) {
                    vbox = lh.pop();
                    if (!vbox.count()) { /* just put it back */
                        lh.push(vbox);
                        niters++;
                        continue;
                    }
                    // do the cut
                    var vboxes = medianCutApply(histo, vbox),
                        vbox1 = vboxes[0],
                        vbox2 = vboxes[1];

                    if (!vbox1) {
                        //                    console.log("vbox1 not defined; shouldn't happen!");
                        return;
                    }
                    lh.push(vbox1);
                    if (vbox2) { /* vbox2 can be null */
                        lh.push(vbox2);
                        ncolors++;
                    }
                    if (ncolors >= target) return;
                    if (niters++ > maxIterations) {
                        //                    console.log("infinite loop; perhaps too few pixels!");
                        return;
                    }
                }
            }

            // first set of colors, sorted by population
            iter(pq, fractByPopulations * maxcolors);

            // Re-sort by the product of pixel occupancy times the size in color space.
            var pq2 = new PQueue(function (a, b) {
                return pv.naturalOrder(a.count() * a.volume(), b.count() * b.volume());
            });
            while (pq.size()) {
                pq2.push(pq.pop());
            }

            // next set - generate the median cuts using the (npix * vol) sorting.
            iter(pq2, maxcolors - pq2.size());

            // calculate the actual colors
            var cmap = new CMap();
            while (pq2.size()) {
                cmap.push(pq2.pop());
            }

            return cmap;
        }

        return {
            quantize: quantize
        };
    })();

    /*
     * getColorContrast - Customized for Material Design and RGB usage only
     *     Return suggested contrast color (dark or light) for the color (rgba/rgb) given.
     *     Takes advantage of YIQ: https://en.wikipedia.org/wiki/YIQ
     *         dark = background is light, use dark colors for text, images, etc..
     *         light = background is dark, use light colors for text, images, etc..
     *     Inspired by: http://24ways.org/2010/calculating-color-contrast/
     *
     * @param color string A valid rgb value
     * @return      string dark|light
     * @copyright (c) 2015 Julian Richen
     * @license Licensed under MIT License https://raw.githubusercontent.com/julianrichen/javascript-dynamic-contrast/master/LICENSE
     *
     */

    var getColorContrast = function (color) {
        if (!color) {
            return null;
        }
        var rgbExp = /^rgba?[\s+]?\(\s*(([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5]))\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,?(?:\s*([\d.]+))?\s*\)?\s*/im,
            rgb = color.match(rgbExp),
            r,
            g,
            b,
            yiq;
        if (rgb) {
            r = parseInt(rgb[1], 10);
            g = parseInt(rgb[2], 10);
            b = parseInt(rgb[3], 10);
        } else {
            return null;
        }
        yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        // 128~150 and not 128, based on Material Design colors
        // Unfortunately there's no specific/right number
        return (yiq >= 146) ? 'dark' : 'light';

    }

    // -- -- Initialize color thief once
    var colorThiefNew = new ColorThief();



    /*
     * Helpers
     */

    // -- -- Process Server Info
    // ** ** Will be called in init() and autoUpdate()
    var processServerInfo = function (ot, sI, data, KA) {
        var sIL = sI.length,
            sIFrag = document.createDocumentFragment();
        for (var i = 0; i < sIL; i++) {
            var serverInfo;
            if (ot.version === 2) {
                serverInfo = data.getElementsByTagName(sI[i].toUpperCase())[0].textContent;
            } else {
                var serverInfoV1 = data.body.textContent.split(','); // Data here are not XML

                if (sI[i] === 'currentlisteners') {
                    serverInfo = serverInfoV1[0]
                } else if (sI[i] === 'streamstatus') {
                    serverInfo = serverInfoV1[1]
                } else if (sI[i] === 'peaklisteners') {
                    serverInfo = serverInfoV1[2]
                } else if (sI[i] === 'maxlisteners') {
                    serverInfo = serverInfoV1[3]
                } else if (sI[i] === 'uniquelisteners') {
                    serverInfo = serverInfoV1[4]
                } else if (sI[i] === 'bitrate') {
                    serverInfo = serverInfoV1[5]
                } else if (sI[i] === 'songtitle') {
                    serverInfo = serverInfoV1[6]
                }
            }

            if (i === sIL - 1) {
                sIFrag.appendChild(document.createTextNode(serverInfo));
            } else {
                sIFrag.appendChild(document.createTextNode(serverInfo + ' - '));
            }
        }

        // Now append to DOM
        KA.appendChild(sIFrag);
    }


    // -- Custom smart Cross-browser ajax request designed for SHOUTcast servers
    // -- options @object: url, timeout, arraybuffer, load, error
    var XHR = function (op) {
        var req;
        req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new XDomainRequest();

        if (op.arraybuffer) {
            req.responseType = 'arraybuffer';
        }

        req.onload = function () {

            if (req.readyState === 4) {

                if (req.status === 200) { // For safety! According to Mozilla docs
                    var data = (op.arraybuffer) ? req.response : req.responseText;
                    op.load(data, req)
                } else {
                    if (op.error) {
                        op.error()
                    }
                }

            }

        }

        if (op.error) {
            req.onerror = op.error
        }


        req.ontimeout = req.onerror;
        req.timeout = op.timeout || 3000;
        req.open('GET', op.url, true);
        req.send();
        
        // Global it, so I could abort any active requests when I destroy Kast
        window.kastXHR = req
    }
    
    // -- Remove brackets + Remove invaild characters
    var chaRe = function (strie) {
        return strie.replace(/(\[.*?\]|\(.*?\))/g, '').replace(/[|&^'`;:$%@"#<>+,]/g, '')
    };

    /*
     * Feature Detection (ONCE)
     */

    // -- -- XMLHttpRequest 2 and Blob constructor check
    var XHR2Blob = (window.XMLHttpRequest && typeof new XMLHttpRequest().responseType === 'string' && window.Blob) || '';

    // -- -- Document clasList support (Extremely fast and easy Add/Remove/Toggle classes)
    var classL = document.documentElement.classList || '';




    // Plugin prototypes
    // ======================================================== //
    Plugin.prototype = {
        init: function () {
            // -- load options (theme, colors, etc...)
            // -- Place player elements here
            // -- Call prototypes

            // -- that
            var that = this,
                ot = that.opt;

            // -- Some classes
            var clrs = ot.colors,
                primaryColor = (typeof clrs === 'object') ? 'kast-primary-' + clrs.primary.replace(' ', '') : '', // Primary color
                accentColor = (typeof clrs === 'object') ? 'kast-accent-' + clrs.accent.replace(' ', '') : '', // Accent color
                dynamicColors = (typeof clrs === 'string') ? 'kast-colors-' + clrs : '', // Dynamic colors
                ultra = (that.mobile && that.mobileUltra) ? 'kast-ultra' : '', // Mobile ultra mode
                notFullBar = (!ot.statusBar || !ot.muteUnmute || !ot.minimizeMaximize) ? 'kast-not-full-statusbar' : '', // So i could make text longer
                played = (ot.played) ? ' kast-played ' : ' kast-current ', // Played or current
                container = (ot.container !== 'body') ? 'kast-custom-container' : '', // Custom container (Not sticky if not body)
                dynamicTheme = (ot.theme === 'dynamic') ? 'kast-light' : '', // light theme if dynamic
                statusBarHtml = '', // Status bar HTML
                playedHtml = '';

            // -- Status bar HTML
            if (ot.statusBar) {
                var muteUnmuteHtml = (ot.muteUnmute) ? '<i id="kast-volume" class="kast-mdi kast-mdi-volume-high"></i>' : '',
                    minMaxHtml = (ot.minimizeMaximize) ? '<i id="kast-minmax" class="kast-mdi kast-mdi-chevron-down"></i>' : '';

                statusBarHtml = '<div id="kast-bar"><p class="kast-offline-status">' + ot.language.offlineText + '</p><p id="kast-server"></p>' + muteUnmuteHtml + minMaxHtml + '</div>';
            }

            // -- Played/Bottom HTML
            if (ot.played) {
                playedHtml = '<div id="kast-bottom" class="kast-clearfix"><p>' + ot.language.playedText + '</p><ul id="kast-playedlist" class="kast-clearfix"></ul><div>';
            }

            // -- Kast HTML  
            var html = '';
            html += '<div id="kast" class="kast-recss kast-' + ot.theme + ' kast-' + ot.ui + ' ' + primaryColor + ' ' + accentColor + ' ' + dynamicColors + ' kast-' + ot.startTemplate + ' kast-' + ot.position + ' ' + ultra + ' ' + notFullBar + played + ' ' + container + ' ' + dynamicTheme + '">'
            html += '<div id="kast-wrapper">';
            html += statusBarHtml; // isn't better than appending it later ?
            html += '<div id="kast-top" class="kast-default-art">';
            html += '<div class="kast-album-wrapper"><i class="kast-mdi kast-mdi-album"></i></div>';
            html += '<div id="kast-top-content" class="kast-top-content">';
            html += '<div id="kast-nowplaying"><p id="kast-np-artist"></p><p id="kast-np-title"></p></div>';
            html += '<div id="kast-linear"></div>';
            html += '</div>';
            html += '<div id="kast-play" class="kast-paused">';
            html += '<i class="kast-mdi kast-mdi-play"></i>';
            html += '<i class="kast-mdi kast-mdi-pause"></i>';
            html += '</div></div>' + playedHtml + '</div></div>';

            document.querySelector(ot.container).insertAdjacentHTML("beforeend", html); // DOM access: Insert last
            ot.onReady(); // Event


            // -- Status bar, CurrentTrack, CurrentArtist
            if (ot.statusBar || ot.currentTrack || ot.currentArtist) {

                // -- -- Stats (CurrentTrack, CurrentArtist)
                this.stats(function (data) {

                    // -- Set Server Info once
                    var sI = ot.serverInfo;

                    if (sI && ot.statusBar) {
                        var kastServer = document.getElementById('kast-server');
                        if (typeof sI === 'string') { // Custom Server info
                            kastServer.textContent = sI;
                        } else {
                            processServerInfo(ot, sI, data, kastServer)
                        }
                    }

                    // -- Passing data
                    // ** that.stats(data) --> processStats(data) #Without_repulling
                    that.stats(data);

                });

            }

            // -- Played
            if (ot.played) {

                // -- Set played tracks/artists
                if (Array.isArray && Array.isArray(ot.artwork)) {
                    that.played(false, true)
                } else {
                    that.played()
                }

            }

            // -- Auto Update
            var aU = ot.autoUpdate;
            if (aU === 'all') {
                that.autoUpdate('all');
            } else if (aU) {
                that.autoUpdate(true);
            }




            // -- Binding (addEventListener isn't necessary, beside onclick is extremely fast)           
            document.getElementById('kast-play').onclick = function () {
                if (this.className.indexOf('paused') !== -1) {
                    that.play()
                } else {
                    that.pause()
                }
            };

            if (ot.statusBar) {

                if (ot.muteUnmute) {
                    document.getElementById('kast-volume').onclick = function () {
                        if (this.className.indexOf('high') !== -1) {
                            that.mute()
                        } else {
                            that.unmute()
                        }
                    };
                }

                if (ot.minimizeMaximize) {
                    document.getElementById('kast-minmax').onclick = function () {
                        if (kast.className.indexOf('minimized') !== -1) {
                            that.maximize()
                        } else {
                            that.minimize()
                        }
                    };
                }

            }


            // -- Finally
            ot.autoPlay && that.play();
            ot.startMuted && that.mute();          
            


            return this;
        },
        play: function (reload) {
            // -- Play the radio
            // -- addClass/removeClass
            
            var k = document.getElementById('kast'),
                kP = document.getElementById('kast-play');
            if (classL) {
                var kPC = kP.classList;
                kPC.remove('kast-paused')
                kPC.add('kast-playing')
            } else {
                $(kP).removeClass('kast-paused').addClass('kast-playing')
            }

            var wasOffline = (this.opt.offlineCheck && k.getAttribute('data-offline') === 'false');

            // ** Safe Play() for dumb browsers: I force reload the audio, if was Offline, and back online again
            if (reload || wasOffline) {
                this.audio.load();
                console.log('load')
                wasOffline && k.removeAttribute('data-offline') // here we remove it not set it (important)
            }

            this.audio.play();

            this.opt.onPlay(this.audio) // Event

            return this;
        },
        pause: function () {
            // -- pause the radio
            // -- addClass/removeClass

            var kP = document.getElementById('kast-play');
            if (classL) {
                var kPC = kP.classList;
                kPC.remove('kast-playing')
                kPC.add('kast-paused')
            } else {
                $(kP).removeClass('kast-playing').addClass('kast-paused')
            }

            this.audio.pause();

            this.opt.onPause(this.audio) // Event

            return this;
        },
        mute: function () {
            // -- mute audio
            // -- className

            document.getElementById('kast-volume').className = 'kast-mdi kast-mdi-volume-off';

            this.audio.muted = true;

            this.opt.onMute(this.audio) // Event

            return this
        },
        unmute: function () {
            // -- unmute audio
            // -- className

            document.getElementById('kast-volume').className = 'kast-mdi kast-mdi-volume-high';

            this.audio.muted = false;

            this.opt.onUnmute(this.audio) // Event

            return this
        },
        minimize: function () {
            // -- minimize the radio
            // -- addClass/removeClass

            var k = document.getElementById('kast');
            if (classL) {
                var kC = k.classList;
                kC.remove('kast-maximized')
                kC.add('kast-minimized')
            } else {
                $(k).removeClass('kast-maximized').addClass('kast-minimized');
            }

            this.opt.onMinimize() // Event

            return this;
        },
        maximize: function () {
            // -- maximize the radio
            // -- addClass/removeClass

            var k = document.getElementById('kast');
            if (classL) {
                var kC = k.classList;
                kC.remove('kast-minimized')
                kC.add('kast-maximized')
            } else {
                $(k).removeClass('kast-minimized').addClass('kast-maximized');
            }

            this.opt.onMaximize() // Event

            return this;
        },
        stats: function (callback) {
            // -- Pull current info
            // -- return it. callback contains data
            // -- data:
            // -- {averagetime, backupstatus, bitrate, content,
            // -- currentlisteners, maxlisteners, peaklisteners,
            // -- servergenre[ -1-5], servertitle, serverurl,
            // -- songtitle, streamhits, streamlisted,
            // -- streamlistederror, streampath, streamstatus,
            // -- streamuptime, uniquelisteners, version}

            var that = this,
                ot = that.opt;


            // -- Cached selectors
            var kast = document.getElementById('kast'),
                kastTitle = document.getElementById('kast-np-title'),
                kastArtist = document.getElementById('kast-np-artist'),
                kastTop = document.getElementById('kast-top'),
                kastBar = document.getElementById('kast-bar'),
                kastTopC = document.getElementById('kast-top-content'),
                kastPlay = document.getElementById('kast-play');

            var processStats = function (data) {
                // -- Mutual data for current track/artist and current artist artwork
                var songTitle, currentTrack, currentArtist;
                
                var unTrack = ot.language.unknownTrackText,
                    unArtist = ot.language.unknownArtistText;
                
                try { 
                    songTitle = (ot.version === 2) ? data.getElementsByTagName('SONGTITLE')[0].textContent : data.body.textContent.split(',')[6]; // V2 || V1
                } catch(e) { // aka 'error'
                    songTitle = unArtist + ' - ' + unTrack;
                }

                // -- Current track/artist
                // ** when custom track/artist is set, everything is still normall, i just set them
                if (typeof ot.currentTrack === 'string') {
                    currentTrack = ot.currentTrack;
                } else {
                    currentTrack = songTitle.split(' - ')[1] || songTitle || unTrack;
                }

                if (typeof ot.currentArtist === 'string') {
                    currentArtist = ot.currentArtist;
                } else {
                    currentArtist = songTitle.split(' - ')[0] || unArtist;
                }

                if (ot.currentTrack) {
                    kastTitle.textContent = currentTrack;
                }
                if (ot.currentArtist) {
                    kastArtist.textContent = currentArtist;
                }


                // -- Pull Current artist artwork
                if (ot.artwork) {
                    that.artwork(currentArtist, currentTrack, function (imgAr) {
                        if (!imgAr) {
                            // -- -- Remove default art
                            // -- -- Reset backgrounds/colors
                            // -- -- Reset theme
                            // ** ** kast addClass/removeClass
                            // ** ** kastTop className
                            // ** ** kastTopC className
                            // ** ** kastPlay addClass/removeClass
                            // ** ** kastBar className

                            if (classL) {

                                var kC = kast.classList,
                                    kPC = kastPlay.classList;
                                kPC.remove('kast-accent-light')
                                kPC.remove('kast-accent-dark')

                                if (ot.theme === 'dark') {
                                    kC.remove('kast-light')
                                    kC.add('kast-dark')
                                } else {
                                    kC.remove('kast-dark')
                                    kC.add('kast-light')
                                }
                            } else {
                                $(kastPlay).removeClass('kast-accent-light kast-accent-dark');

                                if (ot.theme === 'dark') {
                                    $(kast).removeClass('kast-light').addClass('kast-dark');
                                } else {
                                    $(kast).removeClass('kast-dark').addClass('kast-light');
                                }
                            }
                            kastTop.className = 'kast-default-art';
                            if (ot.statusBar) {
                                kastBar.removeAttribute('class') // removeAttr works here
                            }
                            kastPlay.removeAttribute('style')
                            kastTop.removeAttribute('style');
                            kastTopC.removeAttribute('style');
                            kastTopC.className = 'kast-top-content';



                        } else {
                            var imgURL = imgAr[0],
                                imgLite = imgAr[1] || imgURL; // the small one to work with Color Thief (Faster and lighter on the CPU/GPU)

                            kastTop.style.backgroundImage = 'url(' + imgURL + ')';
                            kastTop.removeAttribute('class')


                            ot.onCurrentArtwork(imgURL) // Event

                            // -- Dynamic colors & Dynamic theme
                            // -- both requires artwork obviously

                            // ** XHR2Blob: checking for XHR2 and Blob Constractor support
                            if ((ot.theme === 'dynamic' || ot.colors === 'dynamic') && XHR2Blob) {

                                // -- Golden method for getting colors from XHR images
                                // ** other methods: http://jsfiddle.net/manarkamel/bmvqavjf/                            
                                XHR({
                                    url: imgLite,
                                    arraybuffer: true,
                                    load: function (data, req) {
                                        window.URL = window.URL || window.webkitURL; // support for Safari/Old Chrome
                                        var img = document.createElement('img'),
                                            contentType = req.getResponseHeader('content-type'),
                                            blob = new Blob([data], {
                                                type: contentType
                                            });
                                        img.src = window.URL.createObjectURL(blob);
                                        img.onload = function () {
                                            var color = colorThiefNew.getPalette(img, 5),
                                                primaryBG = 'rgb(' + color[0] + ')',
                                                accentBG = 'rgb(' + color[1] + ')',
                                                primaryContrast = getColorContrast(primaryBG) || 'light',
                                                primaryCC = 'kast-primary-' + primaryContrast,
                                                accentContrast = getColorContrast(accentBG) || 'dark',
                                                accentCC = 'kast-accent-' + accentContrast;


                                            // -- Dynamic colors
                                            if (ot.colors === 'dynamic') {
                                                var kPC = kastPlay.className;
                                                if (kPC.indexOf('playing') !== -1) {
                                                    kastPlay.className = 'kast-playing ' + accentCC
                                                } else {
                                                    kastPlay.className = 'kast-paused ' + accentCC
                                                }
                                                kastTopC.className = 'kast-top-content ' + primaryCC;
                                                if (ot.statusBar) {
                                                    kastBar.className = primaryCC;
                                                }
                                                kastPlay.style.backgroundColor = accentBG;

                                                if (ot.ui === 'colored') {
                                                    kastTopC.style.backgroundColor = primaryBG;
                                                }

                                                ot.onDynamicColors(primaryBG, accentBG) // Event
                                                ot.onDynamicColorsContrast(primaryContrast, accentContrast) // Event
                                            }


                                            // -- Dynamic theme
                                            if (ot.theme === 'dynamic') {
                                                if (primaryContrast === 'light') {
                                                    if (classL) {
                                                        var kC = kast.classList;
                                                        kC.remove('kast-dark')
                                                        kC.add('kast-light')
                                                    } else {
                                                        $(kast).removeClass('kast-dark').addClass('kast-light')
                                                    }

                                                    ot.onDynamicTheme('light') // Event
                                                } else {
                                                    if (classL) {
                                                        var kC = kast.classList;
                                                        kC.remove('kast-light')
                                                        kC.add('kast-dark')
                                                    } else {
                                                        $(kast).removeClass('kast-light').addClass('kast-dark')
                                                    }

                                                    ot.onDynamicTheme('dark') // Event
                                                }
                                            }

                                            // -- objectURL is no longer needed
                                            // ** now we should release it to free cache/memory :)

                                            // -- So... FINISH HIM! (him = objectURL)
                                            window.URL.revokeObjectURL(img.src)
                                            img = null
                                        }
                                    }
                                })


                            }

                        }

                    })
                }

                ot.onCurrentInfo(currentTrack, currentArtist) // Event 
            };

            if (typeof callback === 'object') {
                processStats(callback) // because it's not a callback, it's DATA
            } else {
                var ajaxStats = function (hostCORSproxy, showError) {
                    var url = hostCORSproxy + ot.statsPath + '?sid=' + ot.sid,
                        urlParm = (ot.version === 1) ? '#' : '?_=';
                    if (ot.version === 1) {
                        url = hostCORSproxy + '7.html';
                    }
                    XHR({
                        url: url + urlParm + Math.random(),
                        timeout: 8000,
                        load: function (data) {
                            var dataType = (ot.version === 1) ? 'text/html' : 'text/xml',
                                dataDOM = new DOMParser().parseFromString(data, dataType);

                            if (typeof callback === 'function') {
                                callback(dataDOM);
                            } else {
                                processStats(dataDOM)
                            }
                        },
                        error: function () {
                            if (showError) {
                                var isOffline = kast.hasAttribute('data-offline'),
                                    kastNT = document.getElementById('kast-np-title'); // artist could work too

                                // ** ** OfflineCheck requires autoUpdate
                                if (ot.offlineCheck && ot.autoUpdate && !isOffline) {
                                    if (classL) {
                                        kast.classList.add('kast-offline');
                                    } else {
                                        $(kast).addClass('kast-offline');
                                    }


                                    kast.setAttribute('data-offline', 'true')
                                    ot.onOffline();
                                }
                                
                                // ** ** If empty add unknown
                                if (!kastNT.hasChildNodes()) {
                                    processStats('error')
                                }

                            } else {
                                // -- -- fallback to another proxy and show error this time
                                ajaxStats(that.hostCORS2, true)
                            }
                        }
                    })

                }
                ajaxStats(that.hostCORS, false)
            }


            return this
        },
        played: function (callback, woArtwork) {
            // -- Pull played info
            // -- return it. callback contains data

            var that = this,
                ot = that.opt;

            // Cached selectors
            var kastPL = document.getElementById('kast-playedlist');

            var processPlayed = function (data) {

                    // -- Empty
                    while (kastPL.firstChild) {
                        kastPL.removeChild(kastPL.firstChild);
                    }

                    var song, songL,
                        songsFrag = document.createDocumentFragment(),
                        unTrack = ot.language.unknownTrackText,
                        unArtist = ot.language.unknownArtistText;
                
                    try {
                        song = data.getElementsByTagName('SONG');
                        songL = song.length;
                    } catch(e) {
                        songL = 3;
                    }

                    var processPL = function (j, song, songL, songsFrag) {

                        var playedTrack, playedArtist, title;
                        
                        try {
                            title = song[j].getElementsByTagName('TITLE')[0].textContent;
                        } catch(e) {
                            title = unArtist + ' - ' + unTrack;
                        }
                        
                        
                        if (ot.playedTracks) {
                            playedTrack = title.split(' - ')[1] || title || unTrack;
                        }
                        if (ot.playedArtists) {
                            playedArtist = title.split(' - ')[0] || unArtist;
                        }

                        // -- Track Element
                        var li = document.createElement('li'),
                            divA = document.createElement('div'),
                            i = document.createElement('i'),
                            divI = document.createElement('div'),
                            pTitle = document.createElement('p'),
                            pArtist = document.createElement('p');
                        divA.className = 'kast-p-art';
                        i.className = 'kast-mdi kast-mdi-album';
                        divI.className = 'kast-p-info';
                        pTitle.className = 'kast-p-title';
                        pTitle.textContent = playedTrack;
                        pArtist.className = 'kast-p-artist';
                        pArtist.textContent = playedArtist;

                        li.appendChild(divA)
                        li.appendChild(divI)
                        divA.appendChild(i)
                        divI.appendChild(pTitle)
                        divI.appendChild(pArtist);


                        // -- Played artworks
                        if (ot.artwork && !woArtwork) {

                            that.artwork(playedArtist, playedTrack, function (imgAr) {

                                if (imgAr) {
                                    divA.style.backgroundImage = 'url(' + imgAr[1] + ')';

                                    ot.onPlayedArtworks(imgAr[1]) // Event

                                } else {
                                    divA.className = 'kast-p-art kast-p-default-art';
                                }

                            })
                        } else {
                            divA.className = 'kast-p-art kast-p-default-art';
                        }

                        ot.onPlayedInfo(playedTrack, playedArtist) // Event

                        songsFrag.appendChild(li)

                    }

                    for (var j = 1; j < songL; j++) { // i = 1; Not first child
                        processPL(j, song, songL, songsFrag)
                    }

                    kastPL.appendChild(songsFrag); // Append at last, like a boss
                },
                ajaxPlayed = function (hostCORSproxy, showError) {
                    var url = hostCORSproxy + ot.playedPath + '?sid=' + ot.sid + '&type=xml';

                    XHR({
                        url: url + '&_=' + Math.random(),
                        timeout: 8000,
                        load: function (data) {
                            // ** Bug in crossorigin.me, data sometimes is string 'Error: Error: Parse Error' (500 Error)
                            // ** reported https://github.com/technoboy10/crossorigin.me/issues/28

                            var dataType = (ot.version === 1) ? 'text/html' : 'text/xml',
                                dataDOM = new DOMParser().parseFromString(data, dataType);

                            if (callback) {
                                callback(dataDOM)
                            } else {
                                processPlayed(dataDOM)
                            }
                        },
                        error: function (data) {
                            if (showError) {
                                if (!kastPL.hasChildNodes()) {
                                    processPlayed('error')
                                }
                            } else {
                                // -- -- fallback to another proxy and show error this time
                                ajaxPlayed(that.hostCORS2, true)
                            }
                        }
                    })


                }
            ajaxPlayed(that.hostCORS, false)

            return this
        },
        autoUpdate: function (uKey) {            
            var that = this,
                ot = that.opt;
            
            // -- Cached selectors
            var kast = document.getElementById('kast'),
                kastServer = document.getElementById('kast-server'),
                kastPlay = document.getElementById('kast-play'),
                kastC;
            
            if(classL) {
                kastC = kast.classList;
            }
            
            // -- Turn off
            if(!uKey) {
                clearInterval(kast.getAttribute('data-interval'))
                kast.removeAttribute('data-interval')
                return
            }

            // -- Checker fn to check for songtitle change
            var checker = function () {
                    that.stats(function (data) {

                        var isPlaying = (kastPlay.className.indexOf('playing') !== -1);

                        // -- Offline check
                        if (ot.offlineCheck) {
                            var SS = (ot.version === 2) ? data.getElementsByTagName('STREAMSTATUS')[0].textContent : data.body.textContent.split(',')[1];

                            var isOffline = kast.hasAttribute('data-offline');

                            if (!data || SS !== '1') { // Yes! String not integer

                                if (!isOffline) {
                                    if (classL) {
                                        kastC.add('kast-offline') // I already have classList cached
                                    } else {
                                        $(kast).addClass('kast-offline')
                                    }

                                    kast.setAttribute('data-offline', 'true');
                                    ot.onOffline();
                                }

                            } else {

                                if (isOffline) {
                                    if (classL) {
                                        kastC.remove('kast-offline')
                                    } else {
                                        $(kast).removeClass('kast-offline')
                                    }

                                    //isPlaying && that.play(true); // we need true

                                    kast.setAttribute('data-offline', 'false');
                                    ot.onOnline()
                                }
                            }

                        }
                        
                        
                        // ** When offline->online back again, we call play() again
                        // ** and there's bug in some SHOUTcast servers (AAC+) or maybe in Chrome,
                        // ** sometimes the audio goes off for no reason,
                        // ** so in order to play, we need to pause->play to play audio,
                        // ** that's no longer necessary 
                        isPlaying && that.play();

                        // -- update server info 
                        if (uKey === 'all') {
                            var sI = ot.serverInfo,
                                sB = ot.statusBar;
                            if (typeof sI !== 'string' && sB) { // I don't update custom server info
                                kastServer.textContent = '';
                                processServerInfo(ot, sI, data, kastServer)
                            }
                        }

                        // ** If both are string, and played is false
                        // ** then there's absolutely no need to check for songtitle and continue
                        var customTA = (typeof ot.currentTrack === 'string' && typeof ot.currentArtist === 'string');
                        if (customTA && !ot.played) {
                            ot.onUpdate(data) // Event
                            ot.onUpdateAll(data) // Event
                            return
                        }

                        var streamSTitle = (ot.version === 2) ? data.getElementsByTagName('SONGTITLE')[0].textContent : data.body.textContent.split(',')[6], // V2 || V1
                            currentSTitle = kast.getAttribute('data-current');

                        // ** on start, data is undefined, so let's define it
                        if (!currentSTitle) {
                            return kast.setAttribute('data-current', streamSTitle);
                        }

                        if (currentSTitle !== streamSTitle) {
                            // ** These functions will only be called on SHOUTcast songtitle change, not every 5 seconds,
                            // ** So if there's some heavy DOM manipulation here, no problem at all

                            if (!customTA) { // I don't update custom T/A *if both are string
                                that.stats(data);
                            }

                            if (ot.played) {
                                var isArtArr = (Array.isArray && Array.isArray(ot.artwork));
                                if (isArtArr) {
                                    that.played(false, true)
                                } else {
                                    that.played()
                                }
                            }


                            kast.setAttribute('data-current', streamSTitle);


                            ot.onUpdate(data) // Event
                        }

                        ot.onUpdateAll(data) // Event
                    })
                },
                setTimer = function (fn, time) {
                    if (!kast.hasAttribute('data-interval')) {
                        var setInterID = setInterval(fn, time);
                        kast.setAttribute('data-interval', setInterID)
                    }
                },
                timeMS = 8000;

            if (that.mobile) {
                timeMS = (that.mobileMedium) ? 16000 : 12000;
            }
            
            setTimer(checker, timeMS)

            return this
        },
        artwork: function (artist, track, callback) {
            // -- Pull album artwork from spotify API
            // -- or artist artwork as fallback
            // -- or Default art as fallback
            // -- return it

            var that = this,
                ot = this.opt;

            if (Array.isArray && Array.isArray(ot.artwork)) {
                return callback(ot.artwork)
            }

            if (artist === ot.language.unknownArtistText) { // If artist is unknown
                return callback(null)
            }

            var artistC = chaRe(artist),
                trackC = chaRe(track),
                processArtworkX = function (data) { // @retuns images array if found or null
                    var imgAr = null;
                    if (data.tracks && data.tracks.items[0]) {
                        var imagesArrayT = data.tracks.items[0].album.images || '',
                            imgLarge,
                            imgSmall = imagesArrayT[2].url || '';

                        if (that.mobileMedium) { // ** Mobile first :)
                            imgLarge = imagesArrayT[1].url || ''; // ** Medium quailty
                        } else {
                            imgLarge = imagesArrayT[0].url || '';
                        }

                        if (imgLarge && imgSmall) {
                            imgAr = [imgLarge, imgSmall];
                        }
                    } else if (data.artists && data.artists.items[0] && data.artists.items[0].images[0]) {
                        var imagesArrayA = data.artists.items[0].images || '',
                            imgLarge = null,
                            imgSmall = null;

                        if (data.artists.items[0].images.length === 4) { // ** Not normal artist images                       
                            if (that.mobileMedium) { // ** Mobile first :)
                                imgLarge = imagesArrayA[2].url || ''; // ** Medium quailty
                            } else {
                                imgLarge = imagesArrayA[1].url || '';
                            }

                            imgSmall = imagesArrayA[3].url || '';

                        } else {
                            if (that.mobileMedium) { // ** Mobile first :)
                                imgLarge = imagesArrayA[1].url || ''; // ** Medium quailty
                            } else {
                                imgLarge = imagesArrayA[0].url || '';
                            }

                            imgSmall = imagesArrayA[2].url || '';
                        }
                        if (imgLarge && imgSmall) {
                            imgAr = [imgLarge, imgSmall];
                        }
                    }

                    return imgAr
                },
                ajaxArtwork = function (artistN, trackN, noLuck) {
                    var spotifyTrackAPI = 'https://api.spotify.com/v1/search?q=artist:' + artistN + '%20track:' + trackN + '&limit=1&type=track',
                        spotifyArtistAPI = 'https://api.spotify.com/v1/search?q=artist:' + artistN + '&limit=1&type=artist',
                        spotifyAPI = noLuck ? spotifyArtistAPI : spotifyTrackAPI;

                    // Smart pulling
                    XHR({
                        url: spotifyAPI,
                        load: function(data) {
                            var dataJSON = JSON.parse(data);
                            var imgAr = processArtworkX(dataJSON); // @returns artwork array or null
                            if (imgAr) {
                                callback(imgAr)
                            } else {

                                if (noLuck) {
                                    callback(null)
                                } else {
                                    ajaxArtwork(artistN, trackN, true) // ** this time get artist art and if !imgAr return null
                                }

                            }
                        },
                        error: function () {
                            callback(null)
                        }
                    })
                },
                iW = ot.irrelevantWords;

            if (iW) {
                var iWL = iW.length;
                for (var i = 0; i < iWL; i++) {
                    artistC = artistC.replace(iW[i], '')
                    trackC = trackC.replace(iW[i], '')
                }

                ajaxArtwork(artistC, trackC) // smart artwork pulling

            } else {
                ajaxArtwork(artistC, trackC) // smart artwork pulling
            }



            return this
        },
        destroy: function () {
            // -- Destroy the plugin     
            window.kastXHR && window.kastXHR.abort(); // Terminate any active XHR
            
            this.autoUpdate(false); // Clear AutoUpdate data
            this.audio.pause(); // Pause audio
            
            $.data(document.body, 'plugin_kast', null); // Clear Kast data
            var k = document.getElementById('kast');
            k && k.parentNode.removeChild(k) // Remove Kast element


            return this
        }
    }

    // Plugin wrapper
    // ======================================================== //
    $.kast = function (options, keys) {
        var dB = document.body;

        if (!$.data(dB, 'plugin_kast')) {

            if (options === 'destroy') {
                return
            }

            $.data(dB, 'plugin_kast', new Plugin(this, options));
        } else if (typeof Plugin.prototype[options] === 'function') {
            $.data(dB, 'plugin_kast')[options](keys);
        }

    }


})(jQuery, window, document);