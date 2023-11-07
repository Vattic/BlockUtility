var GradientGen = (function() {
    var shortPath = true;
    var root = document.querySelector(':root');
    var blockA;
    var blockZ;
    var colorA = {mode: 'oklch', l: 1, c: 0.2, h: 20};
    var colorZ = {mode: 'oklch', l: 0, c: 0.2, h: 144};

    var beingPicked = 'colorA';
    var stopSlider;
    var hueSlider;
    var chromaSlider;
    var lightnessSlider;

    const color = (mode, a, b, c) => {
        switch(mode) {
            case 'oklch':
                return {
                    'mode': 'oklch',
                    'l': a,
                    'c': b,
                    'h': c
                };
            default:
                return {
                    'mode': 'rgb',
                    'r': a,
                    'g': b,
                    'b': c
                };
        }
    };

    /**
     * Takes a color in any mode / color space and returns css for the in gamut rgb for that color
     * @param {Dictionary} color in format expected by culori
     * @returns String 'rgb(r, g, b)'
     */
    var get_rgb_css = (color) => {
        if (culori.displayable(color)) {
            return culori.formatRgb(culori.converter('rgb')(color));
        }
        return culori.formatRgb(culori.toGamut('rgb')(color));
    }

    var update_preview_gradient = () => {
        // color stops
        let previewGradient = culori.interpolate([colorA, colorZ], 'oklch', {
            h: {
                fixup: shortPath ? culori.fixupHueShorter : culori.fixupHueLonger
            }
        });
        let midColor = previewGradient(0.5);
        let leftColor = previewGradient(0.25)
        let rightColor = previewGradient(0.75)
        let midStop = stopSlider.get_percent('handleMid') / 100;
        let leftStop = stopSlider.get_percent('handleLeft') / 100;
        let rightStop = stopSlider.get_percent('handleRight') / 100;
        
        previewGradient = culori.interpolate([colorA, [leftColor, leftStop], [midColor, midStop], [rightColor, rightStop], colorZ], 'oklch');
        
        let steps = 50;
        let previewGradientCSS = 'linear-gradient(90deg, ';
        for (let i = 0; i <= steps; i+=1) {
            let percent = i / steps;
            let intermediate = previewGradient(percent);
            intermediate = get_rgb_css(intermediate);
            previewGradientCSS += intermediate + ', '
        }
        previewGradientCSS = previewGradientCSS.slice(0, -2) + ')';
        root.style.setProperty('--previewGradient', previewGradientCSS);
        // set handle colors
        root.style.setProperty('--midHandleColor', get_rgb_css(midColor));
        root.style.setProperty('--leftHandleColor', get_rgb_css(leftColor));
        root.style.setProperty('--rightHandleColor', get_rgb_css(rightColor));
        //
        root.style.setProperty('--colorA', get_rgb_css(colorA));
        root.style.setProperty('--colorZ', get_rgb_css(colorZ));

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
        colorA = {'mode': 'lch', 'l': textureA.averageColor[0], 'c': textureA.averageColor[1], 'h': textureA.averageColor[2]};
        colorZ = {'mode': 'lch', 'l': textureZ.averageColor[0], 'c': textureZ.averageColor[1], 'h': textureZ.averageColor[2]};
        colorA = culori.converter('oklch')(colorA);
        colorZ = culori.converter('oklch')(colorZ);
        
        if (beingPicked == 'colorA') {
            set_color_picker(colorA);
        }
        else {
            set_color_picker(colorZ);
        }

        update_preview_gradient();
    }

    var swap = () => {
        [blockA, blockZ] = [blockZ, blockA];
        [colorA, colorZ] = [colorZ, colorA];
        

        if (beingPicked == 'colorA') {
            set_color_picker(colorA);
        }
        else {
            set_color_picker(colorZ);
        }

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
            let fromLeft = stopSlider.get_percent('handleLeft') / stopSlider.get_percent('handleMid');
            if (isNaN(fromLeft)) {
                fromLeft = 0;
            }
            return fromLeft;
        }

        var calculate_right = () => {
            let fromMid = (stopSlider.get_percent('handleRight') - stopSlider.get_percent('handleMid')) / (100 - stopSlider.get_percent('handleMid'));
            if (isNaN(fromMid)) {
                fromMid = 0;
            }
            return fromMid;
        }

        stopSlider = new Slider('stopSlider', 0, 100, 1, false, false);

        stopSlider.add_handle('handleStart', 0, false, 0, 100);
        stopSlider.add_handle('handleEnd', 100, false, 0, 100);

        stopSlider.add_handle('handleLeft', 25, true, 0, 45);
        stopSlider.add_handle('handleRight', 75, true, 54, 100);
        stopSlider.add_handle('handleMid', 50, true, 4, 95);

        stopSlider.set_handle_dragged(function() {
            // store % distance to middle handle
            $('#handleLeft').data('fromLeft', calculate_left());
            update_preview_gradient();
        }, 'handleLeft');

        stopSlider.set_handle_dragged(function() {
            // store % distance to middle handle
            $('#handleRight').data('fromMid', calculate_right());

            update_preview_gradient();
        }, 'handleRight');

        stopSlider.set_handle_dragged(function() {
            // stop the left handle from going past the middle handle
            let handleRadiusPercent = ($('#handleMid').width() / 2) / $(stopSlider.container).width();
            let newMax = stopSlider.get_percent('handleMid') - handleRadiusPercent * 100;
            console.log(newMax)
            stopSlider.set_handle_max(newMax, 'handleLeft');
            // stop the right handle from going past the middle handle
            let newMin = stopSlider.get_percent('handleMid') + handleRadiusPercent * 100;
            console.log(newMin)
            stopSlider.set_handle_min(newMin, 'handleRight');
            // store % distance to middle handle if not already stored
            if (!$('#handleLeft').data('fromLeft')) {
                $('#handleLeft').data('fromLeft', calculate_left());
            }
            if (!$('#handleRight').data('fromMid')) {
                $('#handleRight').data('fromMid', calculate_right());
            }
            // move the left and right handles to keep their % distance from middle handle constant
            let percent = stopSlider.get_percent('handleMid') * $('#handleLeft').data('fromLeft');
            stopSlider.set_percent(percent, false, 0, 'handleLeft');
            percent = stopSlider.get_percent('handleMid') + $('#handleRight').data('fromMid') * (100 - stopSlider.get_percent('handleMid'));
            stopSlider.set_percent(percent, false, 0, 'handleRight');

            update_preview_gradient();
        }, 'handleMid');
    }

    var update_color_picker = () => {
        let hue = hueSlider.get_value();
        let chroma = chromaSlider.get_value() / 100 * 0.4;
        let lightness = lightnessSlider.get_value() / 100 ;
        // hue gradient
        let startColor = color('oklch', lightness, chroma, 0);
        let endColor   = color('oklch', lightness, chroma, 359);
        let hueGradient = culori.interpolate([startColor, endColor], 'oklch', {
            h: {
                fixup: culori.fixupHueLonger
            }
        });
        // chroma gradient
        startColor = color('oklch', lightness, 0, hue);
        endColor   = color('oklch', lightness, 0.4, hue);
        let chromaGradient = culori.interpolate([startColor, endColor], 'oklch');
        // lightness gradient
        startColor = color('oklch', 0, chroma, hue);
        endColor   = color('oklch', 1, chroma, hue);
        let lightnessGradient = culori.interpolate([startColor, endColor], 'oklch');

        let hueGradientCSS = 'linear-gradient(to right, ';
        let chromaGradientCSS = 'linear-gradient(to right, ';
        let lightnessGradientCSS = 'linear-gradient(to right, ';
        for (let i = 0; i <= 100; i+=10) {
            let percent = i / 100;
            // hue gradient
            let intermediate = hueGradient(percent);
            intermediate = get_rgb_css(intermediate);
            hueGradientCSS += intermediate + ', ';
            // chroma gradient
            intermediate = chromaGradient(percent);
            intermediate = get_rgb_css(intermediate);
            chromaGradientCSS += intermediate + ', ';
            // lightness gradient
            intermediate = lightnessGradient(percent);
            intermediate = get_rgb_css(intermediate);
            lightnessGradientCSS += intermediate + ', ';
        }
        hueGradientCSS = hueGradientCSS.slice(0, -2) + ')';
        chromaGradientCSS = chromaGradientCSS.slice(0, -2) + ')';
        lightnessGradientCSS = lightnessGradientCSS.slice(0, -2) + ')';
        root.style.setProperty('--hueGradient', hueGradientCSS);
        root.style.setProperty('--chromaGradient', chromaGradientCSS);
        root.style.setProperty('--lightnessGradient', lightnessGradientCSS);
        // set handle color
        let pickedColor = color('oklch', lightness, chroma, hue);
        pickedColor = get_rgb_css(pickedColor);
        root.style.setProperty('--pickerColor', pickedColor);

        root.style.setProperty('--' + beingPicked, pickedColor);

        if (beingPicked == 'colorA') {
            colorA = color('oklch', lightness, chroma, hue);
        }
        else {
            colorZ = color('oklch', lightness, chroma, hue);
        }

        update_preview_gradient();
    }

    var set_color_picker = (color) => {
        hueSlider.set_value(color.h);
        chromaSlider.set_value(color.c / 0.4 * 100);
        lightnessSlider.set_value(color.l * 100);
    };

    var setup_color_picker = () => {
        hueSlider = new Slider('hueSlider', 0, 360, 1, true, true);
        chromaSlider = new Slider('chromaSlider', 0, 100, 1, true, true);
        lightnessSlider = new Slider('lightnessSlider', 0, 100, 1, true, true);

        hueSlider.add_handle('hueHandle', 336, true, 0, 360);
        chromaSlider.add_handle('chromaHandle', 50, true, 0, 100);
        lightnessSlider.add_handle( 'lightnessHandle', 41, true, 0, 100);

        hueSlider.set_handle_changed(update_color_picker);
        chromaSlider.set_handle_changed(update_color_picker);
        lightnessSlider.set_handle_changed(update_color_picker);

        $(document).on('click', '#handleStart', function() {
            beingPicked = 'colorA';
            set_color_picker(colorA);
        });
        $(document).on('click', '#handleEnd', function() {
            beingPicked = 'colorZ';
            set_color_picker(colorZ);
        });
        
        update_color_picker();
    }

    var main = () => {
        setup_stop_slider();
        setup_color_picker();
        randomise_textures();

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