function load(settings, onChange) {
    console.log("I'am here");
    // example: select elements with id=key and class=value and insert value
    if (!settings) return;
    $('.value').each(function () {
        var $key = $(this);
        var id = $key.attr('id');
        if ($key.attr('type') === 'checkbox') {
            // do not call onChange direct, because onChange could expect some arguments
            $key.prop('checked', settings[id])
                .on('change', () => onChange());
        } else {
            // do not call onChange direct, because onChange could expect some arguments
            $key.val(settings[id])
                .on('change', () => onChange())
                .on('keyup', () => onChange());
        }
    });
    onChange(false);
    // reinitialize all the Materialize labels on the page if you are dynamically adding inputs:
    if (M) M.updateTextFields();
}

// This will be called by the admin adapter when the user presses the save button
function save(callback) {
    const validators = $('.validator');
    validators.addClass('disabled-validator');
    validators.removeClass('active-validator');
    var obj = {};
    let errors = 0;
    $('.value').each(function () {
        var $this = $(this);
        if ($this.attr('type') === 'checkbox') {
            obj[$this.attr('id')] = $this.prop('checked');
        } else if ($this.attr('type') === 'number') {
            if ($this.val() == '') {
                errors++;
                const validator = $('.validator[for="' + $this.attr('id') + '"]');
                validator.removeClass('disabled-validator');
                validator.addClass('active-validator');
            }
            obj[$this.attr('id')] = parseFloat($this.val());
        } else if ($this.attr('type') === 'text' && $this.attr('id') === 'upsip') {
            if (!validateAddress(this)) {
                errors++;
                const validator = $('.validator[for="' + $this.attr('id') + '"]');
                validator.removeClass('disabled-validator');
                validator.addClass('active-validator');
            }
            obj[$this.attr('id')] = $this.val();
        }
        else {
            obj[$this.attr('id')] = $this.val();
        }
    });
    if (errors == 0) {
        callback(obj);
    }
}

function validateNumber(event) {
    const validator = $(event).siblings('.validator');
    validator.addClass('disabled-validator');
    validator.removeClass('active-validator');
    if ($(event).val() === '') {
        validator.removeClass('disabled-validator');
        validator.addClass('active-validator');
    }
}

function validateAddress(event) {
    const validator = $(event).siblings('.validator');
    validator.addClass('disabled-validator');
    validator.removeClass('active-validator');
    let result = true;
    if ($(event).val().length === 0 || $(event).val().length > 511) {
        result = false;
    }
    if (result) {
        const regExpIp = new RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);
        const regResultIp = regExpIp.exec($(event).val());
        if (regResultIp === null) {
            result = false;
        }
    }
    if (!result) {
        validator.removeClass('disabled-validator');
        validator.addClass('active-validator');
    }
    return result;
}