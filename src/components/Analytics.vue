<template>
    <div class="app-analytics">
        <slot />
    </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
    try {
        const script = document.createElement('script')
        script.defer = true
        script.src = 'https://ana.102465.xyz/script.js'
        script.setAttribute('data-website-id', '06398185-fc0b-477d-9b93-773fff463796')
        document.head.appendChild(script)
        console.log('Analytics script loaded')
    } catch (error) {
        console.error('Failed to load Analytics script:', error)
    }
})
</script>