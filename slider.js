class Slider {
    constructor(
        elementID,
        min = 0, max = 100,
        step = 1,
        showInput = false,
        clickJump = true
    ) {
        this.container = $('#' + elementID);
        if (!this.container.length) { throw new Error('No element found with id ' + elementID); }
        this.selectedHandle = false;
        this.grabOffset = 0;
        this.range = {
            'min': min,
            'max': max
        }
        this.step = step;
        this.clickJump = clickJump;

        this.container.addClass('slider');
        this.container.append($('<div>', { class: 'bar' }));
        //add text input to each slider
        this.showInput = showInput;
        if (showInput){
            this.container.addClass('withInput');
            this.container.append($('<input>', {
                type: 'number',
                inputmode: 'decimal',
                autocomplete: 'off',
                spellcheck: 'off'
            }));
            // delays update until user stops typing in text input
            this.timeout;
        }
        if (clickJump) {
            this.container.addClass('clickJump');
        }
    }

    clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    roundToNearest(numToRound, numToRoundTo) {
        numToRoundTo = 1 / (numToRoundTo);
    
        return Math.round(numToRound * numToRoundTo) / numToRoundTo;
    }

    get_handle(handleID = undefined) {
        if (typeof handleID === 'object') {
            return handleID;
        }
        // if no handleID is given it finds the first handle in the slider
        // this is useful for sliders with only one handle
        if (handleID === undefined) {
            let handle = $(this.container).find('handle');
            if (!handle.length) { throw new Error('No handle within slider with ID ' + $(this.container).attr('id')); }
            return handle;
        }
        else if (typeof handleID === 'string') {
            let handle = $('#' + handleID);
            if (!handle.length) { throw new Error('No handle found with id ' + handleID); }
            return handle;
        }
        throw new Error('Unsupported arguments passed to \'get_handle\' must be undefined, a string of the handle element ID, or the selected handle element.');
    }

    get_input(input = undefined) {
        if (input === undefined) {
            input = $(this.container).find('input');
        }
        return input;
    }

    get_input_value(input) {
        if (!this.showInput) { return; }
        input = this.get_input(input);
        let value = Number($(input).val());
        return value;
    }

    get_value(handle = undefined) {
        let percent = this.get_percent(handle);
        let value = this.percent_to_value(percent);
        return value;
    }

    set_input_value(value, input = undefined) {
        if (!this.showInput) { return; }
        input = this.get_input(input);
        input.val(value);
    }

    set_value(value, animated = false, speed = 500, handle = undefined) {
        handle = this.get_handle(handle);
        value = this.roundToNearest(value, this.step);
        // clamp to be within handle min and max
        let handleRange = $(handle).data('range');
        value = this.clamp(value,
            handleRange.min,
            handleRange.max
        );
        let percent = this.value_to_percent(value);
        if (animated) {
            this.animate_transition(handle, percent, speed);
        }
        else {
            $(handle).css('left', percent + '%');
        }
        this.set_input_value(value);
        $(handle).data('changed')();
    }

    get_percent(handle = undefined) {
        handle = this.get_handle(handle);
        let percent = handle.position().left / this.container.width() * 100;
        return percent;
    }

    set_percent(percent, animated = false, speed = 500, handle = undefined) {
        handle = this.get_handle(handle);
        // clamp to be within handle min and max
        let handleRange = $(handle).data('range');
        percent = this.clamp(percent,
            this.value_to_percent(handleRange.min),
            this.value_to_percent(handleRange.max)
        );
        // clamp to be within 0 - 100%
        percent = this.clamp(percent, 0, 100);
        if (animated) {
            this.animate_transition(handle, percent, speed);
        }
        else {
            $(handle).css('left', percent + '%');
        }
        let value = this.percent_to_value(percent);
        this.set_input_value(value);
        $(handle).data('changed')();
    }

    set_handle_min(value, handle) {
        handle = this.get_handle(handle);
        let range = handle.data('range');
        range.min = value;
        handle.data('range', range);
    }

    set_handle_max(value, handle) {
        handle = this.get_handle(handle);
        let range = handle.data('range');
        range.max = value;
        handle.data('range', range);
    }

    set_handle_changed(fun, handle) {
        handle = this.get_handle(handle);
        handle.data('changed', fun);
    }

    set_handle_dragged(fun, handle) {
        handle = this.get_handle(handle);
        handle.data('dragged', fun);
    }

    value_to_percent(value) {
        let percent = (value - this.range.min) / (this.range.max - this.range.min) * 100;
        return percent;
    }

    percent_to_value(percent) {
        let value = (this.range.max - this.range.min) * (percent / 100) + this.range.min;
        value = Math.round(value / this.step) * this.step;
        return value;
    }

    animate_transition(handle, percent, speed = 500) {
        var slider = this;
        // stop current animation if there is one
        $(handle).stop(true, false);
        $(handle).animate({
            left: percent + '%'
        }, {
            duration: speed,
            easing: 'swing',
            step: function() {
                // let input = $(slider.container).find('input');
                // input.val(slider.percent_to_value(percent));
                $(handle).data('changed')();
            }
        });
    }

    add_handle(desiredID, value, draggable = true, min = 0, max = 100) {
        let slider = this;
        let handle = $('#' + desiredID);
        if (handle.length) { throw new Error('Already element with id ' + desiredID); }

        handle = $('<handle>', { id: desiredID, tabindex: 0 });
        handle.data('range', { 'min': min, 'max': max });
        handle.data('changed', function(){});
        handle.data('dragged', function(){});
        slider.set_value(value, false, 0, handle);
        slider.container.prepend(handle);

        if(draggable) {
            // grab
            $(handle).on('mousedown touchstart', function(evt) {
                slider.selectedHandle = this;
                $(this).addClass('selected');
                // touch device compatibility
                if (evt.type === 'touchstart') { evt = evt.touches[0] };
                // offset relative to where the handle was grabbed
                slider.grabOffset = evt.pageX - $(this).offset().left - $(this).outerWidth() / 2;
            });
            // drag
            // TODO: could reduce the number of event listeners added to document
            $(document).on('mousemove touchmove', function(evt) {
                if (!slider.selectedHandle) { return; }
                // touch device compatibility
                if (evt.type === 'touchmove') { evt = evt.touches[0] };
                // mouse position relative to slider container
                let x = evt.pageX - slider.container.offset().left;
                // adjust based on where the handle was grabbed
                x -= slider.grabOffset;
                // convert to a percentage to account for UI resizing
                x = x / slider.container.width() * 100;

                slider.set_percent(x, false, 0, slider.selectedHandle);
                $(slider.selectedHandle).data('dragged')();
            });
            // release
            $(document).on('mouseup touchend touchcancel', () => {
                $(slider.selectedHandle).removeClass('selected');
                slider.selectedHandle = false;
            });
        }
        $(handle).on('keydown', function(evt) {
            let value = slider.get_value($(this));
            if (evt.originalEvent.key === 'ArrowRight') {
                value += slider.step;
            }
            else if (evt.originalEvent.key === 'ArrowLeft') {
                value -= slider.step;
            }
            else {
                return;
            }
            slider.set_value(value, false, 0, $(this));
            $(this).data('dragged')();
        });
        if(slider.showInput) {
            // typing
            $(handle).parent().find('input').on('keydown', function(evt) {
                let input = this;
                let key = evt.originalEvent.key;
                if (key === 'ArrowUp' || key === 'ArrowDown') {
                    evt.preventDefault();
                    let value = slider.get_input_value(input);
                    value += key === 'ArrowUp' ? slider.step : -slider.step;
                    slider.set_value(value, false, 0, handle);
                    $(handle).data('dragged')();
                    return;
                }
                // delays updating the handle until the user hasn't typed for a short while
                clearTimeout(slider.timeout);
                self.Timeout = setTimeout(function() {
                    let value = slider.get_input_value($(input));
                    slider.set_value(value, true, 500, handle);
                }, 400);
            });
            // mouse wheel
            $(handle).parent().find('input').on('wheel', function(evt) {
                evt.preventDefault();
                let value = Number($(this).val());
                if (evt.originalEvent.deltaY < 0) {
                    value += slider.step;
                }
                else if (evt.originalEvent.deltaY > 0) {
                    value -= slider.step;
                }
                else {
                    return;
                }
                slider.set_value(value, false, 0, handle);
                $(handle).data('dragged')();
            });
        }
        if(slider.clickJump) {
            $(slider.container).find('.bar').on('click tap', function(evt) {
                // touch device compatibility
                if (evt.type === 'tap') { evt = evt.touches[0] };
                // mouse position relative to slider container
                let x = evt.pageX - slider.container.offset().left;
                // convert to a percentage to account for UI resizing
                x = x / slider.container.width() * 100;
                let handle = slider.get_handle()
                slider.set_percent(x, true, 300);
                $(handle).data('dragged')();
            });
        }
    }
}