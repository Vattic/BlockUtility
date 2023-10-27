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
    #hsl;
    #lch;
    /**
     * Constructor for Color object
     * - 'new Color(colorSpace, coordinates)'
     * - 'new Color('hsl', h, s, l)'
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

        if (arguments[0] == 'hsl') {
            this.#hsl = coordinates;
        }
        else if (arguments[0] == 'lch') {
            this.#lch = coordinates;
        }
    }

    get hsl() {
        // if not already converted then convert and store
        if (typeof this.#hsl == 'undefined') {
            this.#hsl = this.#convertLch2HSL(this.#lch);
        }
        return this.#hsl;
    }

    get lch() {
        // if not already converted then convert and store
        if (typeof this.#lch == 'undefined') {
            this.#lch = this.#convertHSL2Lch(this.#hsl);
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
     * Convert color from HSL to RGB color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} hsl Array of [hue, saturation, and lightness] values in HSL color space hue (0 - 360), saturation and lightness (0 - 100)
     * @returns {[Number, Number, Number]} Array of [r, g, b] values in RGB color space (0 - 255)
     */
    #convertHSL2RGB(hsl) {
        let hue2rgb = function(v1, v2, vH) {
            if (vH < 0) { vH += 1; }
            if (vH > 1) { vH -= 1; }
            if (6 * vH < 1) { return v1 + (v2 - v1) * 6 * vH; }
            if (2 * vH < 1) { return v2; }
            if (3 * vH < 2) { return v1 + (v2 - v1) * ((2 / 3) - vH) * 6; }
            return v1;
        }

        let [h, s, l] = hsl;
        h = Utility.normalise(h, 0, 360, 0, 1);
        [s, l] = Utility.normalise([s, l], 0, 100, 0, 1);

        let r, g, b;

        if ( s == 0 ) {                       //HSL from 0 to 1
            r = l * 255;                      //RGB results from 0 to 255
            g = l * 255;
            b = l * 255;
        }
        else {
            let var_2;
            if ( l < 0.5 ) { var_2 = l * (1 + s); }
            else           { var_2 = (l + s) - (s * l); }

            let var_1 = 2 * l - var_2;

            r = 255 * hue2rgb(var_1, var_2, h + (1 / 3));
            g = 255 * hue2rgb(var_1, var_2, h);
            b = 255 * hue2rgb(var_1, var_2, h - (1 / 3));
        }
        r = Math.floor(r);
        g = Math.floor(g);
        b = Math.floor(b);
        return [r, g, b];
    }

    /**
     * Convert color from RGB to HSL color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} rgb Array of [r, g, b] values in RGB color space (0 - 255)
     * @returns {[Number, Number, Number]} Array of [hue, saturation, and lightness] values in HSL color space hue (0 - 360), saturation and lightness (0 - 100)
     */
    #convertRGB2HSL(rgb) {
        let [r, g, b] = Utility.normalise(rgb, 0, 255, 0, 1);

        let var_Min = Math.min(r, g, b);            //Min. value of RGB
        let var_Max = Math.max(r, g, b);            //Max. value of RGB
        let del_Max = var_Max - var_Min;            //Delta RGB value

        let l = (var_Max + var_Min) / 2;
        let h, s;
        if (del_Max == 0) {                         //This is a gray, no chroma...
            
            h = 0;                                  //HSL results from 0 to 1
            s = 0;
        }
        else {                                      //Chromatic data...
            
            if (l < 0.5) { s = del_Max / (var_Max + var_Min); }
            else         { s = del_Max / (2 - var_Max - var_Min); }

            let del_R = (((var_Max - r) / 6) + (del_Max / 2)) / del_Max;
            let del_G = (((var_Max - g ) / 6) + (del_Max / 2 )) / del_Max;
            let del_B = (((var_Max - b ) / 6) + (del_Max / 2 )) / del_Max;

            if      (r == var_Max) { h = del_B - del_G; }
            else if (g == var_Max) { h = (1 / 3) + del_R - del_B; }
            else if (b == var_Max) { h = (2 / 3) + del_G - del_R; }

            if ( h < 0 ) { h += 1; }
            if ( h > 1 ) { h -= 1; }
        }
        h = Utility.normalise(h, 0, 1, 0, 360);
        [s, l] = Utility.normalise([s, l], 0, 1, 0, 100);
        h = Number(h.toFixed(4));
        s = Number(s.toFixed(4));
        l = Number(l.toFixed(4));
        return [h, s, l];
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
     * Convert color from HSL to CIELChab color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} hsl Array of [h, s, l] values in h (0 - 360), s and l (0 - 100)
     * @returns {[Number, Number, Number]} Array of [l, c, h] values in CIELChab color space
     */
    #convertHSL2Lch(hsl) {
        return this.#convertLab2Lch(this.#convertXYZ2Lab((this.#convertRGB2XYZ(this.#convertHSL2RGB(hsl)))));
    }

    /**
     * Convert color from CIELChab to HSL color space,
     * based on http://www.easyrgb.com/index.php?X=MATH
     * @param {[Number, Number, Number]} lch Array of [l, c, h] values in CIELChab color space
     * @returns {[Number, Number, Number]} Array of [h, s, l] values in h (0 - 360), s and l (0 - 100)
     */
    #convertLch2HSL(lch) {
        return this.#convertRGB2HSL(this.#convertXYZ2RGB(this.#convertLab2XYZ(this.#convertLch2Lab(lch))));
    }
}

var GradientGen = (function() {
    var shortPath = true;
    var root = document.querySelector(':root');
    var blockA;
    var blockZ;
    var colorA = new Color('hsl', 336, 79, 41);
    var colorZ = new Color('hsl', 130, 100, 59);
    var textureBeingPicked;
    var stopSlider;
    var hueSlider;
    var saturationSlider;
    var lightnessSlider;


    /**
     * Linear Interpolation between two colors in lch color space
     * @param {Color} colorA first color
     * @param {Color} colorZ second color
     * @param {Boolean} shortPath direction of interpolation of the angle h
     * @param {Number} p percentage as [0-1] with 0.5 being 50%
     * @returns {Color} color p% between this color and given color
     */
    var lerp_colors = function(colorA, colorZ, shortPath, p) {
        let a = {
            'l': colorA.l,
            'c': colorA.c,
            'h': colorA.h
        }
        let z = {
            'l': colorZ.l,
            'c': colorZ.c,
            'h': colorZ.h
        }
        let l = Utility.lerp(a.l, z.l, p);
        let c = Utility.lerp(a.c, z.c, p);

        let d = z.h - a.h;
        if (shortPath) {
            if (d > 180) {
                a.h += 360;
            }
            else if (d < -180) {
                z.h += 360;
            }
        }
        else {
            if (d > -180 && d < 180) {
                if (d > 0) {
                    a.h += 360;
                }
                else {
                    z.h += 360;
                }
            }
        }
        let h = Utility.lerp(a.h, z.h, p) % 360;
        return new Color('lch', l, c, h);
    }

    /**
     * Converts hsl value into CSS color definition
     * @param {*} _args Either Array [h, s, l], or 3 arguments h, s, l. h (0 - 360), s and l (0 - 100)
     * @returns String "hsl(h, s%, l%)"
     */
    var hsl_2_css = function(_args) {
        let h, s, l;
        if (arguments.length === 1) {
            [h, s, l] = arguments[0];
        }
        else {
            [h, s, l] = arguments;
        }
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    /**
     * Converts CSS color definition into Array of hsl values
     * @param {String} cssString String in format "hsl(h, s%, l%)"
     * @returns Array [h, s, l]
     */
    var css_2_hsl = function(cssString) {
        return cssString.replace('hsl(', '').replace(')', '').replace('%', '').split(', ').map(Number);
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
            p = get_percent(p);
            samples.push(lerp_colors(colorA, colorZ, shortPath, p));
        }
        samples.push(colorZ);
        return samples;
    }

    var get_percent = (p) => {
        let handles = [
            [1, 1],
            [$('#handleRight').data('percent') / 100, 0.75],
            [$('#handleMid').data('percent') / 100, 0.5],
            [$('#handleLeft').data('percent') / 100, 0.25],
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

    var update_preview_gradient = () => {
        let gradientSteps = sample_gradient(50);
        let gradientString = 'linear-gradient(90deg, ';
        for (const color of gradientSteps) {
            gradientString += hsl_2_css(color.hsl) + ', ';
        }
        root.style.setProperty('--previewGradient', gradientString.slice(0, -2) + ')');
        // set the handle colors
        let handleColor = lerp_colors(colorA, colorZ, shortPath, 0.5);
        root.style.setProperty('--midHandleColor', hsl_2_css(handleColor.hsl));
        handleColor = lerp_colors(colorA, colorZ, shortPath, 0.25);
        root.style.setProperty('--leftHandleColor', hsl_2_css(handleColor.hsl));
        handleColor = lerp_colors(colorA, colorZ, shortPath, 0.75);
        root.style.setProperty('--rightHandleColor', hsl_2_css(handleColor.hsl));
    }

    var update_minicolors = () => {
        $('#colorA').minicolors('value', hsl_2_css(colorA.hsl));
        $('#colorZ').minicolors('value', hsl_2_css(colorZ.hsl));
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
        update_preview_gradient();
        // update_minicolors();
    }

    var swap = () => {
        [blockA, blockZ] = [blockZ, blockA];
        [colorA, colorZ] = [colorZ, colorA];
        // update_minicolors();
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

    var setup_stop_slider = () => {

        var calculate_left = () => {
            let fromLeft = $('#handleLeft').data('percent') / $('#handleMid').data('percent');
            if (isNaN(fromLeft)) {
                fromLeft = 0;
            }
            return fromLeft;
        }

        var calculate_right = () => {
            let fromMid = ($('#handleRight').data('percent') - $('#handleMid').data('percent')) / (100 - $('#handleMid').data('percent'));
            if (isNaN(fromMid)) {
                fromMid = 0;
            }
            return fromMid;
        }

        stopSlider = new Slider('stopSlider');
        stopSlider.addHandle({
            id: 'handleLeft',
            value: 25,
            change: function() {
                // stop the left handle from going past the middle handle
                let handleRadiusPercent = ($('#handleMid').width() / 2) / $(stopSlider.container).width();
                $('#handleLeft').data('max', $('#handleMid').data('percent') - handleRadiusPercent * 100);
                // store % distance to middle handle
                $('#handleLeft').data('fromLeft', calculate_left());

                update_preview_gradient();
            }
        });
        stopSlider.addHandle({
            id: 'handleRight',
            value: 75,
            change: function() {
                // stop the right handle from going past the middle handle
                let handleRadiusPercent = ($('#handleMid').width() / 2) / $(stopSlider.container).width();
                $('#handleRight').data('min', $('#handleMid').data('percent') + handleRadiusPercent * 100);
                // store % distance to middle handle
                let fromMid = ($('#handleRight').data('percent') - $('#handleMid').data('percent')) / (100 - $('#handleMid').data('percent'));
                $('#handleRight').data('fromMid', fromMid);

                update_preview_gradient();
            }
        });
        stopSlider.addHandle({
            id: 'handleMid',
            value: 50,
            change: function() {
                // store % distance to middle handle if not already stored
                if (!$('#handleLeft').data('fromLeft')) {
                    $('#handleLeft').data('fromLeft', calculate_left());
                }
                if (!$('#handleRight').data('fromMid')) {
                    $('#handleRight').data('fromMid', calculate_right());
                }
                // move the left and right handles to keep their % distance from middle handle constant
                let percent = $('#handleMid').data('percent') * $('#handleLeft').data('fromLeft');
                $('#handleLeft').css('left', percent + '%');
                $('#handleLeft').data('percent', percent);
                percent = $('#handleMid').data('percent') + $('#handleRight').data('fromMid') * (100 - $('#handleMid').data('percent'));
                $('#handleRight').css('left', percent + '%');
                $('#handleRight').data('percent', percent);

                update_preview_gradient();
            }
        });
    }

    var update_color_picker = () => {
        let hue = hueSlider.handle_value('hueHandle');
        let saturation = $('#saturationHandle').data('percent');
        let lightness = $('#lightnessHandle').data('percent');
        // generate background gradients
        let hueGradient = 'linear-gradient(to right, ';
        let saturationGradient = 'linear-gradient(to right, ';
        let lightnessGradient = 'linear-gradient(to right, ';
        for (let i = 0; i <= 360; i+=10) {
            hueGradient += `hsl(${i}, ${saturation}%, ${lightness}%), `
            let percent = i / 360 * 100;
            saturationGradient += `hsl(${hue}, ${percent}%, ${lightness}%), `
            lightnessGradient += `hsl(${hue}, ${saturation}%, ${percent}%), `
        }
        root.style.setProperty('--hueGradient', hueGradient.slice(0, -2));
        root.style.setProperty('--saturationGradient', saturationGradient.slice(0, -2));
        root.style.setProperty('--lightnessGradient', lightnessGradient.slice(0, -2));
        // set slider handle colors
        root.style.setProperty('--pickerColor', `hsl(${hue}, ${saturation}%, ${lightness}%)`);
        colorA = new Color('hsl', hue, saturation, lightness);
        update_preview_gradient();
    }

    var setup_hsv_sliders = () => {
        hueSlider = new Slider('hueSlider', 0, 360, 1, true);
        saturationSlider = new Slider('saturationSlider', 0, 100, 1, true);
        lightnessSlider = new Slider('lightnessSlider', 0, 100, 1, true);
        hueSlider.addHandle({
            id: 'hueHandle',
            value: 336,
            change: function() {
                update_color_picker();
            }
        });
        saturationSlider.addHandle({
            id: 'saturationHandle',
            value: 79,
            change: function() {
                update_color_picker();
            }
        });
        lightnessSlider.addHandle({
            id: 'lightnessHandle',
            value: 41,
            change: function() {
                update_color_picker();
            }
        });

        update_color_picker();
    }

    var main = () => {
        setup_stop_slider();
        setup_hsv_sliders();
        // RGB Color Pickers
        // $('#colorA').minicolors({
        //     control: 'hue',
        //     format: 'hsl',
        //     defaultValue: hsl_2_css(colorA.hsl),
        //     position: 'bottom left',
        //     change: function(hsl) {
        //         colorA = new Color('hsl', css_2_hsl(hsl));
        //         update_preview_gradient();
        //     }
        // });
        // $('#colorZ').minicolors({
        //     control: 'hue',
        //     format: 'hsl',
        //     defaultValue: hsl_2_css(colorZ.hsl),
        //     position: 'bottom right',
        //     change: function(hsl) {
        //         colorZ = new Color('hsl', css_2_hsl(hsl));
        //         update_preview_gradient();
        //     }
        // });

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