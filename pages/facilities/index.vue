<script>
export default {
  middleware: 'org-member-only',
  asyncData({ redirect }) {
    return redirect('/facilities/nem/?status=operating')
  }
}
</script>
