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
            <svg
                class="charity-logo"
                viewBox="0 0 90 58"
            >
                <g>
                    <path d="M75.1,6.4c-2.3,2.3-5.1,3-6.7,3.3c-2.4,0.5-4.8,0.5-7.2,0.5c-6.8,0-13.2,0.6-19.1,1.7    C25,15.3,11.8,23,11.8,32.7c0,9.5,12.9,17.6,31.1,20.9c2.6,0.5,5.4,0.9,8.3,1.2c-0.5,1.6-3.5,2.6-4.9,2.8    c-5.4,1.1-14.1-1.4-18.5-2.8c-5.5-1.8-12.2-4.5-18-8.9c-2-1.3-11.8-8.6-9.4-19C3.3,12.8,23.9,5.6,34.3,3.1    c12.5-3,25.6-3.8,38.4-2.7C73.6,0.5,78.1,1,78.1,1S77.1,4.4,75.1,6.4z"/>
                    <path d="M47.2,45.4c-7,0-12.7-5.7-12.7-12.7S40.1,20,47.2,20s12.7,5.7,12.7,12.7S54.2,45.4,47.2,45.4L47.2,45.4    L47.2,45.4z"/>
                </g>
            </svg>
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
    height: 45px;
    margin-left: 4px;

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
