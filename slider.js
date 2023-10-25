class Slider {
    /**
     * 
     * @param {String} elementID String of html element id to become slider
     * @param {Number} min Minimum slider value, defaults to 0
     * @param {*} max Maximum slider value, defaults to 100
     * @param {*} step Size of each interval between min and max
     */
    constructor(elementID, min = 0, max = 100, step = 1, showInput = false) {
        this.draggedElement = false;
        this.dragOffset = 0;
        this.range = {
            'min': min,
            'max': max
        }
        this.step = step;
        this.showInput = showInput;
        this.container = $('#' + elementID);
        if (!this.container) { throw new Error('No element found with id ' + elementID); }

        this.container.addClass('slider');
        this.container.addClass('withInput');

        //add text input to each slider
        if (this.showInput){
            let input = $('<input>', {
                type: 'number',
                autocomplete: 'off',
                spellcheck: 'off'
            });
            this.container.append(input);
        }
    }

    clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    /**
     * Get the value of a given handle
     * @param {*} handle either a string with html id of handle element, or selected jquery element
     * @returns {Number}
     */
    handle_value(handle) {
        if (typeof handle === 'string'){
            handle = $('#' + handle);
        }
        let handlePercent = $(handle).data('percent');
        let value = this.percent_to_value(handlePercent);
        return value;
    }
    /**
     * Get value at given percent of slider range
     * @param {Number} percent [0 - 100]
     * @returns {Number} value [range.min - range.max]
     */
    percent_to_value(percent) {
        let value = (this.range.max - this.range.min) * (percent / 100) + this.range.min;
        value = Math.round(value / this.step) * this.step;
        return value;
    }
    /**
     * Get percent of given value in slider range
     * @param {Number} value [range.min - range.max]
     * @returns {Number} percent [0 - 100]
     */
    value_to_percent(value) {
        let percent = (value - this.range.min) / (this.range.max - this.range.min) * 100;
        return percent;
    }
    /**
     * Add a handle to the slider
     * @param {Array} data Dictionary containing at least:
     * 
     * - id: unique id, used as html element id
     * - value: starting value
     * 
     * optionally can include:
     * - draggable: boolean, defaults to true
     * - min: minimum bound, defaults to slider min
     * - max: maximum bound, defaults to slider max
     * - change: function called when handle is manipulated
     */
    addHandle(data) {
        let handle = $('<handle>', {
            id: data.id
        });
        // convert starting value to percent, position element, and store percent
        let percent = this.value_to_percent(data.value);
        $(handle).data('percent', percent);
        $(handle).css('left', percent + '%');
        // set default values
        let defaults = {
            'draggable': true,
            'min': 0,
            'max': 100,
            'change': function(){}
        };
        for (let attributeName in defaults) {
            $(handle).data(attributeName, defaults[attributeName]);
        }
        // overwrite default values with specified ones where appropriate
        let skippedAttributes = ['id', 'value'];
        for (let attributeName in data) {
            if (skippedAttributes.includes(attributeName)) { continue; }
            $(handle).data(attributeName, data[attributeName]);
        }
        this.container.append(handle);
        // set input to show starting value
        $(this.container).find('input').val(data.value);
        
        var self = this;

        $(handle).on('mousedown touchstart', function(evt) {
            // ignore if attempting to grab handle with draggable set to false
            if (!$(this).data('draggable')) {
                return;
            }
            self.draggedElement = this;
            // get dragging to work on touch devices
            if (evt.type === 'touchstart') { evt = evt.touches[0] };
            // handle offset relative to where it is grabbed
            self.dragOffset = evt.pageX - $(this).offset().left - ($(this).outerWidth() / 2);
        });

        $(document).on('mousemove touchmove', function(evt) {
            if (self.draggedElement) {
                // get dragging to work on touch devices
                if (evt.type === 'touchstart') { evt = evt.touches[0] };
                // current mouse position relative to the slider parent container
                let newX = evt.pageX - self.container.offset().left;
                // handle offset relative to where it is grabbed
                newX -= self.dragOffset;
                // clamp handle to be in range min - max, and then within container range (% of container width)
                newX = self.clamp(newX, self.container.width() * ($(self.draggedElement).data('min') / 100), self.container.width() * ($(self.draggedElement).data('max') / 100));
                newX = self.clamp(newX, 0, self.container.width());
                // position as a percentage to account for UI resizing
                newX = (newX / self.container.width()) * 100;

                $(self.draggedElement).data('percent', newX);

                $(self.draggedElement).css('left', newX + '%');
                // set input to new value
                if (self.showInput) {
                    $(self.draggedElement).parent().find('input').val(self.handle_value($(self.draggedElement)));
                }

                $(self.draggedElement).data('change')();
            }
        });

        $(document).on('mouseup touchend touchcancel', function() {
            self.draggedElement = false;
        });

        $(handle).parent().find('input').on('keyup wheel', function() {
            let value = $(this).val();
            let percent = self.value_to_percent(value);
            percent = self.clamp(percent, $(handle).data('min'), $(handle).data('max'))
            $(handle).data('percent', percent);
            $(handle).css('left', percent + '%');
            $(this).val(self.percent_to_value(percent));
            $(handle).data('change')();
        });
    }
}