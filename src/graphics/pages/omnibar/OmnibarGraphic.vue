<template>
    <div class="omnibar-wrapper">
        <img
            src="../../assets/img/small-logo.png"
            class="omnibar-logo"
        >
        <omnibar-slide-rotation
            :slide-title-width="225"
            style="width: 1250px; height: 100%"
        />
        <div class="bg-inset logo-and-total layout horizontal center-vertical">
            <img
                class="charity-logo"
                src="../../assets/img/charity-logo-small.png"
            >
            <donation-total class="m-r-12" />
            <clock />
        </div>
    </div>

</template>

<script setup lang="ts">
import Clock from 'components/Clock.vue';
import DonationTotal from 'components/DonationTotal.vue';
import OmnibarSlideRotation from 'components/omnibar/OmnibarSlideRotation.vue';
</script>

<style lang="scss">
@use '../../styles/constants';

body {
    height: constants.$omnibarHeight !important;
}
</style>

<style lang="scss" scoped>
@use '../../styles/colors';
@use '../../styles/constants';

.omnibar-wrapper {
    width: 100%;
    height: 100%;
    background: colors.$layout-panel-background;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.charity-logo {
    height: 50px;
    margin-right: 8px;

    path {
        fill: #FFDF00;
    }
}

.omnibar-logo {
    width: 200px;
    margin-left: 16px;
}

.logo-and-total {
    height: 72px;
    margin-right: 8px;
}
</style>
