<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
await navigateTo(`/materials-and-forms/${slug}`, { redirectCode: 301, replace: true })
</script>
