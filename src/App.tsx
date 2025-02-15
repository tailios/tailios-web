import { useWindowSize } from 'react-use'
import { useEffect, useState } from 'react'
import { clip } from './ClipAPI'
import Gallery from './Gallery'
import Queue from './Queue'
import Upload from './Upload'
import { downloadBlob, sleep } from './utils'
import { twMerge } from 'tailwind-merge'

const EXAMPLES = ['people', 'shirt', 'shoe', 'cat', 'logo']

export interface Env {
  API_KEY: string;
}

function App() {
  const [queue, setQueue] = useState<Array<Item>>([])
  const [processed, setProcessed] = useState<Array<Item>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiKey] = useState<string>(
    localStorage.getItem('apiKey') || `${import.meta.env.VITE_API_KEY}`,
  )

  // Use effect to process the queue
  useEffect(() => {
    const process = async () => {
      if (!isProcessing) {
        return
      }

      // An item is already processing
      if (queue.some(it => it.status === 'processing')) {
        return
      }

      // Get next queued item
      const index = queue.findIndex(it => it.status === 'queued')

      // No more queued item
      if (index === -1) {
        setIsProcessing(false)
        return
      }

      // Update the queue with the item processing status
      const newQueue = queue.slice()
      const item = newQueue[index]
      item.status = 'processing'
      setQueue(newQueue)

      try {
        // Clip the item
        item.clip = await clip(item, apiKey)
        item.status = 'done'

        // Add the item to the list of processed items
        processed.unshift(item)
        setProcessed(processed.slice())

        // Remove the item from the queue
        newQueue.splice(index, 1)
        setQueue(newQueue)
      } catch (e: any) {
        // Update the queue with the item error status
        item.status = `error: ${e.message}`
        setQueue(newQueue)
      }
    }
    process()
  }, [isProcessing, queue, processed, setQueue, apiKey])

  function addFiles(files: FileList | Array<File>) {
    const newItems = queue.slice()
    Array.from(files).forEach(file => {
      // Skip non-image or csv files
      const isImage = file.type.match('image.*')
      if (!isImage) {
        return
      }

      const item: Item = {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        file: file,
        status: '',
        size:
          file.size > 1024
            ? file.size > 1048576
              ? Math.round(file.size / 1048576) + 'mb'
              : Math.round(file.size / 1024) + 'kb'
            : file.size + 'b',
      }
      try {
        // Check if file is larger than 10mb
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('file too large')
        }
        item.image = URL.createObjectURL(file)
        item.status = 'queued'
      } catch (e: any) {
        item.status = `error: ${e.message}`
      }

      newItems.push(item)
    })
    setQueue(newItems)
  }

  async function addDemo(img: string) {
    const newItems = queue.slice()
    const imgBlob = await fetch(`examples/${img}.jpg`).then(r => r.blob())
    const file = new File([imgBlob], `${img}.jpg`, { type: 'image/jpeg' })
    // Skip non-image or csv files
    const isImage = file.type.match('image.*')
    if (!isImage) {
      return
    }

    const item: Item = {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      file: file,
      status: '',
      size:
        file.size > 1024
          ? file.size > 1048576
            ? Math.round(file.size / 1048576) + 'mb'
            : Math.round(file.size / 1024) + 'kb'
          : file.size + 'b',
    }
    try {
      // Check if file is larger than 10mb
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('file too large')
      }
      item.image = URL.createObjectURL(file)
      item.status = 'queued'
    } catch (e: any) {
      item.status = `error: ${e.message}`
    }

    newItems.push(item)

    setQueue(newItems)
  }

  function onDelete(itemsToDelete: Item | Array<Item>) {
    if (!Array.isArray(itemsToDelete)) {
      itemsToDelete = [itemsToDelete]
    }
    // Optimization in case of "delete all"
    if (itemsToDelete.length === queue.length) {
      setQueue([])
    }
    // Otherwise delete 1 by 1
    const newQueue = queue.slice()
    itemsToDelete.forEach(item => {
      const ix = newQueue.findIndex(it => it.id === item.id)
      newQueue.splice(ix, 1)
    })
    setQueue(newQueue)
  }

  async function onProcess() {
    setIsProcessing(true)
  }

  function onStop() {
    setIsProcessing(false)
  }

  async function onDownload(items: Item | Array<Item>) {
    if (!Array.isArray(items)) {
      items = [items]
    }
    for (const it of items) {
      if (!it.clip) {
        continue
      }
      const name = it.name.slice(0, it.name.lastIndexOf('.')) + '.clip.png'
      downloadBlob(it.clip?.base64, name)
      await sleep(100)
    }
  }
  const windowSize = useWindowSize()
  return (
    <div className="w-full flex flex-col items-center mx-auto">

      <header
        className="flex w-full justify-between border-black border-opacity-10 px-4 pl-8 fixed top-0 left-0">
        <div className="flex items-center space-x-4">
          <h1 className="bg-gradient-to-tr from-cyan-500 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
            <a
              href="https://www.tailios.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              PicMagic
            </a>
          </h1>
          <p className="hidden text-lg font-semibold text-gray-400 sm:block">
            Remove Background
          </p>
        </div>
        <div className="flex flex-row justify-center items-center space-x-3 mt-3 mb-3">
          <div className="flex items-center space-x-12">
            <a
              href="https://t.me/rmbga_bot"
              target="_blank"
              rel="noopener noreferrer"
              className={twMerge(
                'whitespace-nowrap rounded-lg py-3 px-4 font-semibold text-white',
                'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:bg-gradient-to-l',
              )}
            >
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                     className="home__icon"
                     style={{ fill: 'rgba(255, 255, 255, 1)', transform: '' }} data-v-41733f5a="">
                  <path
                    d="M20.665,3.717l-17.73,6.837c-1.21,0.486-1.203,1.161-0.222,1.462l4.552,1.42l10.532-6.645 c0.498-0.303,0.953-0.14,0.579,0.192l-8.533,7.701l0,0l0,0H9.841l0.002,0.001l-0.314,4.692c0.46,0,0.663-0.211,0.921-0.46 l2.211-2.15l4.599,3.397c0.848,0.467,1.457,0.227,1.668-0.785l3.019-14.228C22.256,3.912,21.474,3.351,20.665,3.717z"
                    data-v-41733f5a=""></path>
                </svg>
                Get started for Free
              </div>
            </a>
          </div>
        </div>
      </header>
      <div className="flex flex-col items-center justify-end md:min-h-[30vh]">
        <section
          className="w-full py-8 md:px-8 gap-4 flex flex-col justify-center items-center text-gray-900 dark:text-gray-100 text-center">
          <svg width="48" height="48" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M24.9854 30.0146L21.7521 33.2479C22.7872 34.9922 23.1506 37.0541 22.7743 39.0472C22.3979 41.0403 21.3075 42.8277 19.7075 44.0743C18.1075 45.3209 16.1078 45.9413 14.0832 45.819C12.0586 45.6967 10.1481 44.8402 8.7098 43.41C7.27152 41.9798 6.40422 40.0742 6.27047 38.0503C6.13672 36.0264 6.7457 34.0232 7.98327 32.4162C9.22084 30.8092 11.002 29.7087 12.9929 29.3211C14.9838 28.9334 17.0478 29.2852 18.7979 30.3104L22.0375 27.0688L15.5292 20.5583C14.9433 19.9723 14.6142 19.1776 14.6142 18.349C14.6142 17.5203 14.9433 16.7256 15.5292 16.1396L16.2667 15.4021L24.9854 24.1208L33.7125 15.3938L34.4479 16.1313C35.0331 16.7172 35.3618 17.5115 35.3618 18.3396C35.3618 19.1677 35.0331 19.962 34.4479 20.5479L27.9312 27.0688L31.1833 30.3188C32.9305 29.2886 34.9935 28.931 36.9855 29.313C38.9775 29.695 40.7618 30.7904 42.0039 32.3939C43.246 33.9974 43.8607 35.9989 43.7326 38.0232C43.6046 40.0474 42.7427 41.9555 41.3085 43.3897C39.8742 44.824 37.9662 45.6859 35.9419 45.8139C33.9176 45.9419 31.9162 45.3273 30.3127 44.0851C28.7092 42.843 27.6138 41.0588 27.2317 39.0667C26.8497 37.0747 27.2073 35.0118 28.2375 33.2646L24.9854 30.0146V30.0146ZM39.5833 27.0833V10.4167H10.4167V27.0833H6.25V8.33333C6.25 7.7808 6.46949 7.25089 6.86019 6.86019C7.25089 6.46949 7.7808 6.25 8.33333 6.25H41.6667C42.2192 6.25 42.7491 6.46949 43.1398 6.86019C43.5305 7.25089 43.75 7.7808 43.75 8.33333V27.0833H39.5833ZM14.5833 41.6667C15.6884 41.6667 16.7482 41.2277 17.5296 40.4463C18.311 39.6649 18.75 38.6051 18.75 37.5C18.75 36.3949 18.311 35.3351 17.5296 34.5537C16.7482 33.7723 15.6884 33.3333 14.5833 33.3333C13.4783 33.3333 12.4185 33.7723 11.6371 34.5537C10.8557 35.3351 10.4167 36.3949 10.4167 37.5C10.4167 38.6051 10.8557 39.6649 11.6371 40.4463C12.4185 41.2277 13.4783 41.6667 14.5833 41.6667V41.6667ZM35.4167 41.6667C36.5217 41.6667 37.5815 41.2277 38.3629 40.4463C39.1443 39.6649 39.5833 38.6051 39.5833 37.5C39.5833 36.3949 39.1443 35.3351 38.3629 34.5537C37.5815 33.7723 36.5217 33.3333 35.4167 33.3333C34.3116 33.3333 33.2518 33.7723 32.4704 34.5537C31.689 35.3351 31.25 36.3949 31.25 37.5C31.25 38.6051 31.689 39.6649 32.4704 40.4463C33.2518 41.2277 34.3116 41.6667 35.4167 41.6667V41.6667Z"
              fill="currentcolor"></path>
          </svg>
          <h1
            className="text-4xl sm:text-[52px] font-bold font-secondary break-words text-gray-800 dark:text-gray-100 uppercase relative">Remove
            background</h1><h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400">Remove background
          online in 1 click</h2></section>
      </div>
      <div className="container flex flex-col pt-10 w-full max-w-5xl space-y-12">
        <div
          className={[
            apiKey ? '' : 'opacity-50 pointer-events-none',
            'space-y-12',
          ].join(' ')}
        >
          <Upload onSelection={addFiles} />

          {queue.length ? (
            <Queue
              items={queue}
              onDelete={onDelete}
              onProcess={onProcess}
              onStop={onStop}
              isProcessing={isProcessing}
            />
          ) : (
            <></>
          )}

          {processed.length ? (
            <Gallery items={processed} onDownload={onDownload} />
          ) : (
            <></>
          )}
        </div>
      </div>
      <div
        className={[
          'flex flex-col items-center justify-center cursor-pointer',
          'pt-4 sm:pt-10',
        ].join(' ')}
      >
        <span className="mb-4">↓ Try with an example</span>
        <div className="flex space-x-2 sm:space-x-4 px-4">
          {EXAMPLES.slice(0, windowSize.width > 650 ? undefined : 3).map(
            image => (
              <div
                key={image}
                onClick={() => addDemo(image)}
                role="button"
                onKeyDown={() => addDemo(image)}
                tabIndex={-1}
              >
                <img
                  className="rounded-md hover:opacity-75 w-24 h-24 object-cover"
                  width="96"
                  height="96"
                  src={`examples/${image}.thumb.jpg`}
                  alt={image}
                />
              </div>
            ),
          )}
        </div>
      </div>
      <footer className="mt-5 mb-5 w-full flex flex-col items-center max-w-7xl p-2 md:px-4 mx-auto ">
        <div className="w-full h-[1px] bg-gray-300 dark:bg-gray-600 mb-10"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-16 text-xs mx-4">
          <section className="flex flex-col"><h6 className="mb-6 font-bold dark:text-gray-600">Tailios</h6><a
            className="cursor-pointer my-1 font-semibold text-gray-900 dark:text-gray-600 hover:opacity-50"
            href="/">Home</a></section>
          <section className="flex flex-col"><h6 className="mb-6 font-bold dark:text-gray-600">Support</h6><a
            className="cursor-pointer my-1 font-semibold text-gray-900 dark:text-gray-600 hover:opacity-50"
            href="mailto:tailios.llc@gmail.com">Contact us</a></section>
          <section className="flex flex-col"><h6 className="mb-6 font-bold dark:text-gray-600">Legal</h6><a
            className="cursor-pointer my-1 font-semibold text-gray-900 dark:text-gray-600 hover:opacity-50"
            href="/privacy">Privacy</a><a
            className="cursor-pointer my-1 font-semibold text-gray-900 dark:text-gray-600 hover:opacity-50"
            href="/terms-of-use">Terms of Use</a></section>
          <section className="flex flex-col"><h6 className="mb-6 font-bold dark:text-gray-600">Social</h6><a
            className="cursor-pointer my-1 font-semibold text-gray-900 dark:text-gray-600 hover:opacity-50 flex items-center gap-4"
            href="https://x.com/picmagic001">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentcolor"
                    d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
            </svg>
            Twitter</a><a
            className="cursor-pointer my-1 font-semibold text-gray-900 dark:text-gray-600 hover:opacity-50 flex items-center gap-4"
            href="https://instagram.com/picmajic">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentcolor"
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
            </svg>
            Instagram</a></section>
        </div>
        <div className="text-xs mt-7 text-gray-900 dark:text-gray-600">Copyright 2024 © Tailios</div>
      </footer>
    </div>
  )
}

export default App
