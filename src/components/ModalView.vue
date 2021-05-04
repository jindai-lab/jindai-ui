<template>
     <transition name="modal">
        <div class="modal-mask">
          <div class="modal-wrapper">
            <div class="modal-container">

              <div class="modal-header">
                <slot name="header">
                </slot>
                <a class="modal-close-button" @click="$emit('close')">
                  <font-awesome-icon icon="times" />
                </a>
              </div>

              <div class="modal-body" @blur="$emit('close')">
                <slot name="body">
                  
                </slot>
              </div>

              <div class="modal-footer">
                <slot name="footer">
                  <span style="color: white">....</span>
                </slot>
              </div>
            </div>
          </div>
        </div>
      </transition>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 1024;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: table;
  transition: opacity 0.3s ease;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  width: 80%;
  height: 80vh;
  margin: 0px auto;
  padding: 20px 30px;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  transition: all 0.3s ease;
  font-family: Helvetica, Arial, sans-serif;
  overflow: auto;
}

.modal-header h3 {
  margin-top: 0;
  color: #42b983;
}

.modal-mask {
  margin: 0;
  color: black;
}

.modal-mask a {
  color: black !important;
}

.modal-default-button {
  float: right;
}

/*
 * The following styles are auto-applied to elements with
 * transition="modal" when their visibility is toggled
 * by Vue.js.
 *
 * You can easily play with the modal transition by editing
 * these styles.
 */

.modal-enter {
  opacity: 0;
}

.modal-leave-active {
  opacity: 0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}

.modal-close-button {
  position: absolute;
  top: 12vh;
  right: 10%;
  cursor: pointer;
}

.modal-body {
  line-height: 200%;
}

</style>