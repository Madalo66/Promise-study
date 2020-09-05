// 自定义函数模块：IIFE（立即执行函数）

;(function (window) {
  const PENDING = 'pending'
  const RESOLVED = 'resolved'
  const REJECTED = 'rejectd'
  // Promise构造函数
  // 执行器函数excutor(同步函数)
  class Promise {
    constructor(excutor) {
      // console.log('my promise');
      // 将当前的promise对象保存起来
      const self = this
      self.status = PENDING //给promise对象指定status属性，初始值为pending
      self.data = undefined //给promise对象指定存储结果数据的属性
      self.callbacks = [] //每个元素的结构：{onResolved(){},onRejected(){}}

      function resolve(value) {
        // 如果当前状态不是pending，则返回
        if (self.status !== PENDING) {
          return
        }
        // 将状态改为resolved
        self.status = RESOLVED
        // 保存data数据
        self.data = value
        // 如果有待执行的callback函数，立即异步执行回调函数onResolved
        if (self.callbacks.length > 0) {
          setTimeout(() => {
            //放入队列中执行所有成功的回调
            self.callbacks.forEach((callbacksObj) => {
              callbacksObj.onResolved(value)
            })
          })
        }
      }

      function reject(reason) {
        // 如果当前状态不是pending，则返回
        if (self.status !== PENDING) {
          return
        }
        // 将状态改为rejected
        self.status = REJECTED
        // 保存data数据
        self.data = reason
        // 如果有待执行的callback函数，立即异步执行回调函数onRejected
        if (self.callbacks.length > 0) {
          setTimeout(() => {
            //放入队列中执行所有成功的回调
            self.callbacks.forEach((callbacksObj) => {
              callbacksObj.onRejected(reason)
            })
          })
        }
      }

      // 立即同步执行excutor
      try {
        //如果执行器抛出异常，则promise变为rejected
        excutor(resolve, reject)
      } catch (error) {
        reject(error)
      }
    }

    // Promise原型对象方法then()
    // 指定成功/失败的回调函数
    // 返回一个新的promise对象
    // 返回的promise的结果由onResolved/onRejected执行的结果决定
    then(onResolved, onRejected) {
      // 指定默认的回调函数，必须是函数
      onResolved = typeof 'function' ? onResolved : (value) => value //向后传递成功的value
      onRejected = typeof 'function'
        ? onRejected
        : (reason) => {
            throw reason
          } //如果没有指定onRejected，要给它传一个函数，向后抛出失败的reason，实现异常穿透的关键点
      // 如果是return reason，那么会进入成功的流程
      const self = this
      // 返回一个新的promise对象
      return new Promise((resolve, reject) => {
        // 调用指定的回调函数处理
        function handle(callback) {
          //执行指的回调函数
          // 1.如果抛出异常，return的promise结果就会失败，reason就是error
          // 2.如果返回promise对象，return的promise就是这个prmoise对象
          // 3.如果返回的是非promise对象，return的promise就会成功，value就是返回的值
          try {
            const result = callback(self.data)
            if (result instanceof Promise) {
              result.then(
                (value) => resolve(value),
                (reason) => reject(reason)
              )
              // result.then(resolve,reject)
            } else {
              resolve(result)
            }
          } catch (error) {
            reject(error)
          }
        }
        if (self.status === PENDING) {
          // 当前状态是pending状态，将回调函数保存起来
          self.callbacks.push({
            onResolved() {
              //不仅要执行回调函数，还要改变新的promise的状态，所以不能直接把onResolved/onRejected，push到数组里面
              handle(onResolved)
            },
            onRejected() {
              handle(onRejected)
            },
          })
        } else if (self.status === RESOLVED) {
          setTimeout(() => {
            handle(onResolved)
          })
        } else {
          //rejected
          setTimeout(() => {
            handle(onRejected)
          })
        }
      })
    }

    // Promise原型对象方法catch()
    // 指定失败的回调函数
    // 返回一个新的promise对象
    catch(onRejected) {
      return this.then(undefined, onRejected)
    }

    // Promise函数对象方法resolve()
    // 返回一个结果为value的成功的promise
    static resolve = function (value) {
      // 返回一个成功/失败的promise
      return new Promise((resolve, reject) => {
        // value是promise
        if (value instanceof Promise) {
          value.then(resolve, reject)
        } else {
          // value不是promise
          resolve(value)
        }
      })
    }

    // Promise函数对象方法reject()
    // 返回一个结果为reason的失败的promise
    static reject = function (reason) {
      return new Promise((resolve, reject) => {
        reject(reason)
      })
    }

    // Promise函数对象方法all()
    // 返回一个promise，只有所有promise都成功时才成功，否则失败
    static all = function (promises) {
      const values = new Array(promises.length) //要来保存成功的value数组
      let resolveCount = 0 //用来保存成功的promise的数量
      return new Promise((resolve, reject) => {
        promises.forEach((p, index) => {
          Promise.resolve(p).then(
            (value) => {
              resolveCount++
              // p成功，将成功的value保存到values
              values[index] = value
              // 如果全部成功了，将return的promise改变成功
              if (resolveCount === promises.length) {
                resolve(values)
              }
            },
            (reason) => {
              reject(reason)
            }
          )
        })
      })
    }

    // Promise函数对象方法reject()
    // 返回一个promise，其结果由第一个完成的promise决定
    static race = function (promises) {
      return new Promise((resolve, reject) => {
        promises.forEach((p) => {
          Promise.resolve(p).then(
            (value) => {
              resolve(value)
            },
            (reason) => {
              reject(reason)
            }
          )
        })
      })
    }

    /*
  返回一个promise对象，它在指定的时间后才确定结果
  (在Promise.resolve()上加setTimeout)
  */
    static resolveDelay = function (value, time) {
      // 返回一个成功/失败的promise
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (value instanceof Promise) {
            // value是promise，使用value的结果作为new的promise的结果
            value.then(resolve, reject)
          } else {
            // value不是promise => promise变为成功，数据是value
            resolve(value)
          }
        }, time)
      })
    }

    /*
返回一个promise对象，它在指定的时间后才失败
*/
    static rejectDelay = function (reason, time) {
      // 返回一个失败的promise
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(reason)
        }, time)
      })
    }
  }

  // 向外暴露Promise模块
  window.Promise = Promise
})(window)
