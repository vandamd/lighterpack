<style lang="scss">
.lpNativeColorPicker {
    border: 0;
    cursor: pointer;
    height: 150px;
    padding: 0;
    width: 150px;
}
</style>

<template>
    <Popover id="lpPickerContainer" :shown="shown" @hide="shown = false">
        <template #target>
            <span class="lpLegend" :style="{'background-color': color}" @click="shown = true" />
        </template>
        <template #content>
            <input class="lpNativeColorPicker" type="color" :value="color" @input="onColorChange">
        </template>
    </Popover>
</template>

<script>
import Popover from './popover.vue';

export default {
    name: 'ColorPicker',
    components: {
        Popover,
    },
    props: [
        'color',
    ],
    data() {
        return {
            shown: false,
        };
    },
    methods: {
        onColorChange(event) {
            this.$emit('colorChange', event.target.value);
        },
    },
};

</script>
