// A simple function that checks the event context to make sure it is valid
export async function contextCheck(context) {
  return new Promise(resolve => {
    // If the context is not valid, return false
    if (context.eventName !== 'issue_comment') {
      return resolve(false)
    }

    // If the context is valid, return true
    return resolve(true)
  })
}