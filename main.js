var Utility = (function() {

    /**
     * Clamp a given Number n to be within range min-max
     * @param {Number} n Number to be clamped
     * @param {Number} min Minimum allowed value
     * @param {Number} max Maximum allowed value
     * @returns {Number}
     */
    var clamp = (n, min, max) => Math.min(Math.max(n, min), max);

    /**
     * Convert angle in degrees to radians
     * @param {Number} degrees angle in degrees desired to be converted to radians
     * @returns {Number} angle in radians
     */
     var toRadians = (degrees) => degrees * (Math.PI / 180);
    
    /**
     * Normalise a Number, or Array of Numbers, to be within desired range
     * @param {*} n Number or Array of Numbers to be normalised
     * @param {Number} currentMin smallest possible Number value of n
     * @param {Number} currentMax largest possible Number value of n
     * @param {Number} desiredMin smallest Number in desired range
     * @param {Number} desiredMax largest Number in desired range
     * @returns Number, or Array of Numbers, normalised to be within desiredMin and desiredMax
     */
     var normalise = (n, currentMin, currentMax, desiredMin, desiredMax) => {

        function normalise_n(n) {
            return ((desiredMax - desiredMin) * (n - currentMin) / (currentMax - currentMin)) + desiredMin;
        }

        if (!(n instanceof Array)) {
            return normalise_n(n);
        }
        return n.map(normalise_n);
    }

    /**
     * Linear interpolation between a and b
     * @param {Number} a
     * @param {Number} b
     * @param {Number} p percentage as 0-1 with 0.5 being 50%
     */
    var lerp = (start, stop, p) => {
        let temp = (start + p * (stop - start))
        return temp;
    }

    return {
        clamp,
        toRadians,
        normalise,
        lerp
    }
})();


class Color {
    #rgb;
    #lch;
    /**
     * Constructor for Color object
     * - 'new Color(colorSpace, coordinates)'
     * - 'new Color('rgb', r, g, b)'
     * - 'new Color('lch', l, c, h)'
     * coordinates can also be an Array of Numbers with length 3
     */
    constructor() {
        let coordinates;
        if (arguments.length === 4) {
            coordinates = [arguments[1], arguments[2], arguments[3]];
        }
        else if (
            arguments.length === 2 && 
            arguments[1] instanceof Array && 
            arguments[1].length === 3
            ) {
                coordinates = arguments[1];
        }

        if (arguments[0] == 'rgb') {
            this.#rgb = coordinates;
        }
        else if (arguments[0] == 'lch') {
            this.#lch = coordinates;
        }
    }

    get rgb() {
        // if not already converted then convert and store
        if (typeof this.#rgb == 'undefined') {
            this.#rgb = this.#convertLch2RGB(this.#lch);
        }
        return this.#rgb;
    }

    get lch() {
        // if not already converted then convert and store
        if (typeof this.#lch == 'undefined') {
            this.#lch = this.#convertRGB2Lch(this.#rgb);
        }
        return this.#lch;
    }

    get l() {
        return this.lch[0];
    }

    get c() {
        return this.lch[1];
    }

    get h() {
        return this.lch[2];
    }

    set l(n) {
        this.#lch[0] = n;
    }

    set c(n) {
        this.#lch[1] = n;
    }

    set h(n) {
        this.#lch[2] = n;
    }
    /**
     * Linear Interpolation between this color and a given color in lch color space
     * @param {Boolean} shortPath direction of interpolation of the angle h
     * @param {Color} colorZ second color
     * @param {Number} p percentage as [0-1] with 0.5 being 50%
     * @returns {Color} color p% between this color and given color
     */
    lerp_with(shortPath, colorZ, p) {
        let colorA = this;
        let l = Utility.lerp(colorA.l, colorZ.l, p);
        let c = Utility.lerp(colorA.c, colorZ.c, p);

        let d = colorZ.h - colorA.h;
        if (shortPath == true) {
            if (d > 180) {
                colorA.h += 360;
            }
            else if (d < -180) {
                colorZ.h += 360;
            }
        }
        else {
            if (d > -180 && d < 180) {
                if (d > 0) {
                    colorA.h += 360;
                }
                else {
                    colorZ.h += 360;
                }
            }
        }
        let h = Utility.lerp(colorA.h, colorZ.h, p) % 360;
        return new Color('lch', l, c, h);
    }

    /**
     * Convert color from RGB to CIE XYZ color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} rgb Array of [red, green, and blue] values in RGB color space (0-255)
     * @returns {[Number, Number, Number]} Array of [x, y, z] values in CIE XYZ color space
     */
    #convertRGB2XYZ(rgb) {
        let [r, g, b] = Utility.normalise(rgb, 0, 255, 0, 1);

        r > 0.04045 ? r = ((r + 0.055) / 1.055) ** 2.4 : r = r / 12.92;
        g > 0.04045 ? g = ((g + 0.055) / 1.055) ** 2.4 : g = g / 12.92;
        b > 0.04045 ? b = ((b + 0.055) / 1.055) ** 2.4 : b = b / 12.92;

        [r, g, b] = Utility.normalise([r, g, b], 0, 1, 0, 100);

        // Observer. = 2°, Illuminant = D65
        let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
        let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
        let z = r * 0.0193 + g * 0.1192 + b * 0.9505;

        return [x, y, z];
    }

    /**
     * Convert color from CIE XYZ to RGB color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} xyz Array of [x, y, z] values in CIE XYZ color space
     * @returns {[Number, Number, Number]} Array of [r, g, b] values in RGB color space (0-255)
     */
    #convertXYZ2RGB(xyz) {
        let [x, y, z] = xyz;

        // Observer = 2°, Illuminant = D65
        x /= 100;        // x from 0 to  95.047
        y /= 100;        // y from 0 to 100.000
        z /= 100;        // z from 0 to 108.883

        let r = x *  3.2406 + y * -1.5372 + z * -0.4986;
        let g = x * -0.9689 + y *  1.8758 + z *  0.0415;
        let b = x *  0.0557 + y * -0.2040 + z *  1.0570;

        r > 0.0031308 ? r = 1.055 * (r ** (1 / 2.4)) - 0.055 : r *= 12.92;
        g > 0.0031308 ? g = 1.055 * (g ** (1 / 2.4)) - 0.055 : g *= 12.92;
        b > 0.0031308 ? b = 1.055 * (b ** (1 / 2.4)) - 0.055 : b *= 12.92;

        r = Math.round(r * 255)
        g = Math.round(g * 255)
        b = Math.round(b * 255)

        // clip the values to 0 - 255
        r = Math.min(Math.max(r, 0), 255);
        g = Math.min(Math.max(g, 0), 255);
        b = Math.min(Math.max(b, 0), 255);

        return [r, g, b];
    }

    /**
     * Convert color from CIE XYZ to CIELAB color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} xyz Array of [x, y, z] values in CIE XYZ color space
     * @returns {[Number, Number, Number]} Array of [l, a, b] values in CIELAB color space
     */
    #convertXYZ2Lab(xyz) {
        let [x, y, z] = xyz;

        // Observer= 2°, Illuminant= D65
        x /= 95.047;
        y /= 100.000;
        z /= 108.883;

        x > 0.008856 ? x = x ** (1 / 3) : x = (7.787 * x) + (16 / 116);
        y > 0.008856 ? y = y ** (1 / 3) : y = (7.787 * y) + (16 / 116);
        z > 0.008856 ? z = z ** (1 / 3) : z = (7.787 * z) + (16 / 116);

        let l = (116 * y) - 16;
        let a = 500 * (x - y);
        let b = 200 * (y - z);

        return [l, a, b];
    }

    /**
     * Convert color from CIELAB to CIE XYZ color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} lab Array of [l, a, b] values in CIELAB color space
     * @returns {[Number, Number, Number]} Array of [x, y, z] values in CIE XYZ color space
     */
    #convertLab2XYZ(lab) {
        let [l, a, b] = lab;
        let y = (l + 16) / 116;
        let x = a / 500 + y;
        let z = y - b / 200;

        y ** 3 > 0.008856 ? y = y ** 3 : y = (y - 16 / 116) / 7.787;
        x ** 3 > 0.008856 ? x = x ** 3 : x = (x - 16 / 116) / 7.787;
        z ** 3 > 0.008856 ? z = z ** 3 : z = (z - 16 / 116) / 7.787;

        // Observer= 2°, Illuminant= D65
        x *= 95.047; 
        y *= 100.000;
        z *= 108.883;

        return [x, y, z];
    }

    /**
     * Convert color from CIELAB to CIELChab color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} lab Array of [l, a, b] values in CIELAB color space
     * @returns {[Number, Number, Number]} Array of [l, c, h] values in CIELChab color space
     */
    #convertLab2Lch(lab) {
        let [l, a, b] = lab;

        // Quadrant by signs
        let h = Math.atan2(b, a);

        h > 0 ? h = (h / Math.PI) * 180 : h = 360 - (Math.abs(h) / Math.PI) * 180;

        let c = Math.sqrt(a ** 2 + b ** 2);

        return [l, c, h];
    }

    /**
     * Convert color from CIELChab to CIELAB color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} lch Array of [l, c, h] values in CIELChab color space
     * @returns {[Number, Number, Number]} Array of [l, a, b] values in CIELAB color space
     */
    #convertLch2Lab(lch) {
        let [l, c, h] = lch;

        // h from 0 to 360°
        let a = Math.cos(Utility.toRadians(h)) * c;
        let b = Math.sin(Utility.toRadians(h)) * c;

        return [l, a, b];
    }

    /**
     * Convert color from RGB to CIELChab color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} rgb Array of [r, g, b] values in RGB color space (0-255)
     * @returns {[Number, Number, Number]} Array of [l, c, h] values in CIELChab color space
     */
    #convertRGB2Lch(rgb) {
        return this.#convertLab2Lch(this.#convertXYZ2Lab((this.#convertRGB2XYZ(rgb))));
    }

    /**
     * Convert color from CIELChab to RGB color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} lch Array of [l, c, h] values in CIELChab color space
     * @returns {[Number, Number, Number]} Array of [r, g, b] values in RGB color space (0-255)
     */
    #convertLch2RGB(lch) {
        return this.#convertXYZ2RGB(this.#convertLab2XYZ(this.#convertLch2Lab(lch)));
    }
}

class GradientSlider {
    constructor(elementID, updateFunction) {
        this.leftHandle = 0.25;
        this.midHandle = 0.5;
        this.rightHandle = 0.75;
        this.leftRelative = 0.5;
        this.rightRelative = 0.5;
        this.dragged = false;
        this.container = $('#' + elementID);
        this.offset = 0;

        if (!this.container) {
            throw new Error('No element found with id ' + elementID);
        }

        this.container.append(`<handle id="leftHandle" style="left:${this.leftHandle * 100}%;z-index:1"></handle>`);
        this.container.append(`<handle id="midHandle" style="left:${this.midHandle * 100}%;z-index:2"></handle>`);
        this.container.append(`<handle id="rightHandle" style="left:${this.rightHandle * 100}%;z-index:1"></handle>`);

        // offset the container so that the vertical center-line of the handles line up
        $(this.container).css('left', (-1 * ($('#leftHandle').width() / 2)));

        var self = this;
        $('handle').on('mousedown', function(evt) {
            self.dragged = this;
            // handle offset relative to where it is clicked
            self.offset = evt.pageX - $(this).offset().left;
        });

        $(document).on('mousemove', function(evt) {
            if (self.dragged) {
                // evt.preventDefault();

                // current mouse position relative to the slider parent container
                let newX = evt.pageX - self.container.offset().left;

                // handle offset relative to where it is clicked
                newX -= self.offset;

                // keep handles within bounds both between each other and within parent container
                const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
                if ($(self.dragged).attr('id') == 'leftHandle') {
                    newX = clamp(newX, 0, $('#midHandle').position().left - $('#midHandle').width());
                }
                else if ($(self.dragged).attr('id') == 'midHandle') {
                    newX = clamp(newX, 0, self.container.width());
                }
                else {
                    newX = clamp(newX, $('#midHandle').position().left + $('#midHandle').width(), self.container.width());
                }

                // position as a percent to account for UI resizing
                newX = newX / self.container.width();
                if ($(self.dragged).attr('id') == 'leftHandle') {
                    self.leftHandle = newX;
                    // left handles position relative to the middle handle
                    self.leftRelative = newX / self.midHandle;
                }
                else if ($(self.dragged).attr('id') == 'midHandle') {
                    self.midHandle = newX;
                }
                else {
                    self.rightHandle = newX;
                    // right handles position relative to the middle handle
                    self.rightRelative = 1 - (1 - newX) / (1 - self.midHandle);
                }

                $(self.dragged).css('left', newX * 100 + '%');

                if ($(self.dragged).attr('id') == 'midHandle') {
                    self.leftHandle = Utility.lerp(0, self.midHandle, self.leftRelative);
                    self.rightHandle = Utility.lerp(self.midHandle, 1, self.rightRelative);
                    
                    $('#leftHandle').css('left', self.leftHandle * 100 + '%');
                    $('#rightHandle').css('left', self.rightHandle * 100 + '%');
                }

                updateFunction();
            }
        });

        $(document).on('mouseup', function() {
            if (self.dragged) {
                self.dragged = false;
            }
        });
    }

    get_percent(p) {
        let handles = [
            [1, 1],
            [this.rightHandle, 0.75],
            [this.midHandle, 0.5],
            [this.leftHandle, 0.25],
            [0, 0]
        ];
        for (let i = 1; i < handles.length; i++) {
            // figure out which two handles bound the input
            let lowerBound = handles[i][0];
            if (p < lowerBound) {
                continue;
            }
            let upperBound = handles[i - 1][0];

            // percentage difference of input between said handles
            let q = (p - lowerBound) / (upperBound - lowerBound);

            // percentage mix at that distance along line
            let lowerP = handles[i][1];
            let upperP = handles[i - 1][1];
            return lowerP + q * (upperP - lowerP);
        }
    }
}

var GradientGen = (function() {
    var shortPath = true;
    var blockA;
    var blockZ;
    var colorA = new Color('rgb', 189, 22, 88);
    var colorZ = new Color('rgb', 48, 255, 82);
    var textureBeingPicked;
    var slider;

    /**
     * Converts rgb values into CSS color definition
     * @param {*} _args Either Array [r, g, b], or 3 arguments r, g, b. Numbers between 0-255
     * @returns String "rgb(r, g, b)"
     */
    var rgb_2_css = function(_args) {
        let r, g, b;
        if (arguments.length === 1) {
            [r, g, b] = arguments[0];
        }
        else {
            [r, g, b] = arguments;
        }
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Converts CSS color definition into Array of rgb values
     * @param {String} cssString String in format "rgb(r, g, b)"
     * @returns Array [r, g, b]
     */
    var css_2_rgb = function(cssString) {
        return cssString.replace('rgb(', '').replace(')', '').split(', ').map(Number);
    }

    /**
     * 
     * @param {Number} sampleNumber, 
     * @returns 
     */
    var sample_gradient = (sampleNumber = 10) => {
        let samples = [];
        samples.push(colorA);
        for (let n = 1; n < sampleNumber-1; n++) {
            let p = n / sampleNumber;
            p = slider.get_percent(p);
            samples.push(colorA.lerp_with(shortPath, colorZ, p));
        }
        samples.push(colorZ);
        return samples;
    }

    var update_preview_gradient = () => {
        let gradientSteps = sample_gradient(50);
        let gradientString = 'linear-gradient(90deg, ';
        for (const color of gradientSteps) {
            gradientString += rgb_2_css(color.rgb) + ', ';
        }
        $('#gradientPreview').css('background-image', gradientString.slice(0, -2));
    }

    var update_minicolors = () => {
        $('#colorA').minicolors('value', rgb_2_css(colorA.rgb));
        $('#colorZ').minicolors('value', rgb_2_css(colorZ.rgb));
    }

    var random_texture = () => {
        return textures[(Math.floor(Math.random() * textures.length))];
    }

    var randomise_textures = () => {
        let textureA = random_texture();
        let textureZ = textureA;
        while (textureZ == textureA) {
            textureZ = random_texture();
        }
        colorA = new Color('lch', textureA.averageColor);
        colorZ = new Color('lch', textureZ.averageColor);
        update_minicolors();
    }

    var swap = () => {
        [blockA, blockZ] = [blockZ, blockA];
        [colorA, colorZ] = [colorZ, colorA];
        update_minicolors();
        update_preview_gradient();
    }

    var toggle_path_length = () => {
        shortPath = !shortPath;
        if (shortPath) {
            $('#pathIcon').attr('src', './icon/short.svg');
        }
        else {
            $('#pathIcon').attr('src', './icon/long.svg');
        }
        update_preview_gradient();
    }

    var populate_texture_menu = () => {
        // TODO: filters and presets
        $("#textureMenuWrapper").html("");
        let previousInitial = textures[0].id.charAt(0);
        let html = '<div>';
        textures.forEach(function (texture, index) {
            let currentInitial = texture.id.charAt(0);
            if (!(currentInitial === previousInitial)) {
                html += '</div><div>';
                previousInitial = currentInitial;
            }
            html += `<button id="${index}" class="textureButton"><img class="textureIcon" src="./data/texturesets/default_1.20.1/textures/${texture.id}" alt="" /></button>`;
        });
        html += '</div>';
        $("#textureMenuWrapper").append(html);
    }

    var setup_texture_menu = () => {
        populate_texture_menu();

        // open buttons for texture menu
        $(document).on('click', '#textureButtonA', function() {
            textureBeingPicked = $('#colorA');
            $('#textureMenu').fadeIn(200);
        });
        $(document).on('click', '#textureButtonZ', function() {
            textureBeingPicked = $('#colorZ');
            $('#textureMenu').fadeIn(200);
        });

        // close button for texture menu
        $(document).on('click', '#textureMenuCloseButton', function() {
            $('#textureMenu').fadeOut(200);
        });

        // close using esc key
        $(document).on('keydown', function(e) {
            if ( e.key === 'Escape' ) {
                $('#textureMenu').fadeOut(200);
            }
        });

        // select texture from menu
        $(document).on('click', '.textureButton', function() {
            $('#textureMenu').fadeOut(200);
            let index = $(this).attr('id');
            let averageColor = new Color('lch', textures[index].averageColor);
            textureBeingPicked.minicolors('value', rgb_2_css(averageColor.rgb));
            
        });

        // tooltip for block names on mouseover
        $(document).on('mouseover', '.textureButton', function() {
            let index = $(this).attr('id');
            let name = textures[index].id.replace('.png', '').replace(/[-._]/g, ' ').split('/').slice(-1);
            $('#tooltip').html(name);
            $('#tooltip').css('left', $(this).offset().left).css('top', $(this).offset().top + $(this).outerHeight());
            $('#tooltip').show();
        });
        $(document).on('mouseleave', '.textureButton', function() {
            $('#tooltip').hide();
        });
    }

    var main = () => {
        slider = new GradientSlider('slider', update_preview_gradient);
        // RGB Color Pickers
        $('#colorA').minicolors({
            control: 'hue',
            format: 'rgb',
            defaultValue: rgb_2_css(colorA.rgb),
            position: 'bottom left',
            change: function(rgb) {
                colorA = new Color('rgb', css_2_rgb(rgb));
                update_preview_gradient();
            }
        });
        $('#colorZ').minicolors({
            control: 'hue',
            format: 'rgb',
            defaultValue: rgb_2_css(colorZ.rgb),
            position: 'bottom right',
            change: function(rgb) {
                colorZ = new Color('rgb', css_2_rgb(rgb));
                update_preview_gradient();
            }
        });

        $(document).on('click', '#randomiseButton', randomise_textures);
        $(document).on('click', '#swapButton', swap);
        $(document).on('click', '#pathButton', toggle_path_length);
        setup_texture_menu();

        update_preview_gradient(); 
    }

    $(document).ready(function() {
        main();
    });
})();