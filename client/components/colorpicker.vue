<style lang="scss">
.lpColorPicker {
    align-items: center;
    display: flex;
    height: 12px;
    justify-content: center;
    position: relative;
    transform: translateY(-0.5px);
    width: 12px;
}

.lpNativeColorPicker {
    border: 0;
    cursor: pointer;
    height: 100%;
    left: 0;
    opacity: 0;
    padding: 0;
    position: absolute;
    top: 0;
    width: 100%;
}
</style>

<template>
    <span class="lpColorPicker">
        <span class="lpLegend" :style="{'background-color': color}" />
        <input ref="colorInput" class="lpNativeColorPicker" type="color" :value="color" @input="onColorChange">
    </span>
</template>

<script>
export default {
    name: 'ColorPicker',
    props: [
        'color',
    ],
    methods: {
        onColorChange(event) {
            this.$emit('colorChange', event.target.value);
        },
    },
};

</script>
