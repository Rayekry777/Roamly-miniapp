Component({
  properties: {
    description: { type: String, value: '这里暂时还没有内容' },
    actionText: { type: String, value: '' }
  },
  methods: { onAction() { this.triggerEvent('action') } }
})
