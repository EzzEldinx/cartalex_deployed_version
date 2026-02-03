import { getValuesFromSubFilter } from './server_api.js';

export class SubFilter {
    constructor(filter_name, subfilter_config) {
        this.name = subfilter_config['name'];
        this.filter_name = filter_name;
        this.options = subfilter_config['options'] || {};
        this.request_options = subfilter_config['request_options'] || {};
        this.values = [];

        this.displayName = this.request_options.alias || this.name;
        this.order = this.request_options.order || '';
        this.isNumeric = this.options.isNumeric || false;

        if (this.isNumeric) {
            this.enabled = false;
            this.floor = '';
            this.ceil = '';
        }
    }

    async initValues() {
        let rawValues;
        if (!this.isNumeric) {
            rawValues = await getValuesFromSubFilter(this);
            if (!Array.isArray(rawValues)) {
                rawValues = [];
            }
            this.values = rawValues.map(item => {
                return {
                    internalValue: item[this.name],
                    displayValue: item[this.displayName] || item[this.name],
                    labelEn: item.labelEn || null, // Capture labelEn for dynamic switching
                    checked: false
                };
            }).filter(item => item.internalValue !== undefined && item.internalValue !== null);
        } else {
            this.values = [];
        }
        this.unCheckAll();
    }

    getValues() { return this.values; }
    
    checkAll() { this.values.forEach(v => { v.checked = true; }); }
    unCheckAll() { this.values.forEach(v => { v.checked = false; }); }

    isChecked(internalValue) {
        const val = this.values.find(v => String(v.internalValue) === String(internalValue));
        return val ? val.checked : false;
    }

    checkValue(internalContent) {
        const val = this.values.find(v => String(v.internalValue) === String(internalContent));
        if (val) val.checked = true;
    }

    unCheckValue(internalContent) {
        const val = this.values.find(v => String(v.internalValue) === String(internalContent));
        if (val) val.checked = false;
    }

    setEnabled(enabled) { if (this.isNumeric) this.enabled = enabled; }
    isEnabled() { return this.isNumeric && this.enabled; }
    setCeil(ceil) { this.ceil = ceil; }
    getCeil() { return this.ceil; }
    setFloor(floor) { this.floor = floor; }
    getFloor() { return this.floor; }

    getSelectedValues() {
        return this.values.filter(v => v.checked).map(v => v.internalValue);
    }
}